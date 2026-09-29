import { createClient } from 'npm:@supabase/supabase-js@2';
import { callbackAccepted, callbackDuplicate, callbackNotificationFailed, parseCallbackRequest } from '../_shared/callback-request.ts';
import { sendCallbackEmail } from '../_shared/callback-notification.ts';
import { constantTimeEqual, sha256 } from '../_shared/event-lead.ts';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

const ORGANIZATION_ID = Deno.env.get('PILOT_ORGANIZATION_ID') ?? '';
const LOCATION_ID = Deno.env.get('PILOT_LOCATION_ID') ?? '';
const BRIDGE_SECRET = Deno.env.get('ELEVENLABS_BRIDGE_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const PILOT_EMAIL_FROM = Deno.env.get('PILOT_EMAIL_FROM') ?? '';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function unavailable(): Response {
  return json({
    status: 'failed',
    action: 'callback_request_not_processed',
    request_id: null,
    caller_message: 'I could not securely save your request just now. Please try again later.',
    retry_allowed: true,
  }, 503);
}

function notificationFailed(requestId: string): Response {
  return json(callbackNotificationFailed(requestId), 503);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!(ORGANIZATION_ID && LOCATION_ID && BRIDGE_SECRET && SUPABASE_URL && SERVICE_ROLE_KEY)) return unavailable();

  const suppliedSecret = request.headers.get('x-elevenlabs-bridge-secret') ?? '';
  if (!constantTimeEqual(suppliedSecret, BRIDGE_SECRET)) return json({ error: 'unauthorized' }, 401);
  const contentType = request.headers.get('content-type') ?? '';
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (!contentType.toLowerCase().startsWith('application/json') || declaredLength > 8_192) {
    return json({ error: 'invalid_request' }, 400);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 8_192) return json({ error: 'invalid_request' }, 400);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  let input;
  try {
    input = parseCallbackRequest(body);
  } catch {
    return json({
      status: 'needs_information',
      action: 'collect_callback_details',
      request_id: null,
      caller_message: 'I still need your name, the best callback number, and a brief description of what you need help with.',
      retry_allowed: true,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sourceKey = input.sourceCallerPhone ?? input.callbackPhone;
  const [sourceHash, conversationHash] = await Promise.all([
    sha256(sourceKey),
    sha256(input.conversationId),
  ]);
  const { data: withinQuota, error: quotaError } = await supabase.rpc('consume_event_bridge_quota', {
    p_source_key_hash: sourceHash,
    p_conversation_key_hash: conversationHash,
    p_source_limit: 10,
    p_conversation_limit: 5,
  });
  if (quotaError || withinQuota !== true) return unavailable();

  const { data, error } = await supabase.rpc('submit_callback_request', {
    p_organization_id: ORGANIZATION_ID,
    p_location_id: LOCATION_ID,
    p_source_call_id: input.conversationId,
    p_idempotency_key: `${input.conversationId}:callback_request:1`,
    p_source_caller_phone: input.sourceCallerPhone,
    p_caller_name: input.callerName,
    p_callback_phone: input.callbackPhone,
    p_details: input.details,
    p_request_category: input.requestCategory,
  });
  if (error || !data || typeof data !== 'object') return unavailable();
  const result = data as Record<string, unknown>;
  if (result.status === 'accepted' || result.status === 'duplicate') {
    const requestId = typeof result.request_id === 'string' ? result.request_id : null;
    if (!requestId) return unavailable();
    if (!RESEND_API_KEY || !PILOT_EMAIL_FROM) return notificationFailed(requestId);

    const { data: callback, error: callbackError } = await supabase.from('callback_requests')
      .select('id,request_id,source_call_id,source_caller_phone,caller_name,callback_phone,details,request_category')
      .eq('request_id', requestId)
      .eq('organization_id', ORGANIZATION_ID)
      .eq('location_id', LOCATION_ID)
      .maybeSingle();
    if (callbackError || !callback) return notificationFailed(requestId);

    const { data: notification, error: notificationError } = await supabase.from('callback_notifications')
      .select('id,recipient,status,attempt_count,provider_message_id,last_attempt_at')
      .eq('callback_request_id', callback.id)
      .eq('channel', 'email')
      .maybeSingle();
    if (notificationError || !notification) return notificationFailed(requestId);

    // Resend retains idempotency keys for 24 hours. After that window, an
    // uncertain prior attempt must be reviewed instead of risking a duplicate.
    if (notification.status !== 'sent' && notification.last_attempt_at
        && Date.now() - Date.parse(notification.last_attempt_at) > 20 * 60 * 60 * 1000) {
      return notificationFailed(requestId);
    }

    if (notification.status !== 'sent') {
      const { error: attemptError } = await supabase.from('callback_notifications')
        .update({ status: 'pending', attempt_count: notification.attempt_count + 1, last_attempt_at: new Date().toISOString(), last_error_code: null })
        .eq('id', notification.id);
      if (attemptError) return notificationFailed(requestId);

      try {
        const providerMessageId = await sendCallbackEmail({
          requestId: callback.request_id,
          sourceCallId: callback.source_call_id,
          callerName: callback.caller_name,
          sourceCallerPhone: callback.source_caller_phone,
          callbackPhone: callback.callback_phone,
          details: callback.details,
          requestCategory: callback.request_category,
          recipient: notification.recipient,
          from: PILOT_EMAIL_FROM,
        }, RESEND_API_KEY);
        const { error: sentError } = await supabase.from('callback_notifications')
          .update({ status: 'sent', provider_message_id: providerMessageId, last_error_code: null })
          .eq('id', notification.id);
        if (sentError) return notificationFailed(requestId);
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 120) : 'email_delivery_failed';
        await supabase.from('callback_notifications')
          .update({ status: 'failed', last_error_code: errorCode })
          .eq('id', notification.id);
        return notificationFailed(requestId);
      }
    }
    return json(result.status === 'accepted' ? callbackAccepted(requestId) : callbackDuplicate(requestId));
  }
  return unavailable();
});
