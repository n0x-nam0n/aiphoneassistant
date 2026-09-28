import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  constantTimeEqual,
  missingInformation,
  parseEventLead,
  safeFailure,
  sha256,
  transferRequired,
  type CallerResponse,
} from '../_shared/event-lead.ts';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

const ORGANIZATION_ID = Deno.env.get('PILOT_ORGANIZATION_ID') ?? '';
const LOCATION_ID = Deno.env.get('PILOT_LOCATION_ID') ?? '';
const BRIDGE_SECRET = Deno.env.get('ELEVENLABS_BRIDGE_SECRET') ?? '';
const LOCATION_TIME_ZONE = Deno.env.get('PILOT_TIME_ZONE') ?? 'America/Los_Angeles';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function configured(): boolean {
  return Boolean(ORGANIZATION_ID && LOCATION_ID && BRIDGE_SECRET && SUPABASE_URL && SERVICE_ROLE_KEY);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!configured()) return json(safeFailure(false), 503);

  const suppliedSecret = request.headers.get('x-elevenlabs-bridge-secret') ?? '';
  if (!constantTimeEqual(suppliedSecret, BRIDGE_SECRET)) return json({ error: 'unauthorized' }, 401);

  const contentType = request.headers.get('content-type') ?? '';
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (!contentType.toLowerCase().startsWith('application/json') || contentLength > 16_384) {
    return json({ error: 'invalid_request' }, 400);
  }

  let rawBody: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 16_384) return json({ error: 'invalid_request' }, 400);
    rawBody = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  let input;
  try {
    input = parseEventLead(rawBody, LOCATION_TIME_ZONE);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_request';
    const field = code.includes('date') ? 'event_date'
      : code.includes('time') ? 'event_time'
      : code.includes('email') ? 'caller_email'
      : code.includes('number') ? 'party_size'
      : null;
    if (field) return json(missingInformation(null, [field], `I need a valid ${field.replace('_', ' ')} before I can send that inquiry.`));
    return json(safeFailure(false));
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sourceKey = input.sourceCallerPhone ?? input.callerPhone ?? input.conversationId;
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
  if (quotaError || withinQuota !== true) return json(safeFailure(false));

  const requestId = `req_${input.conversationId}`;
  // Provider-injected caller ID is authoritative. Prefer it over model-extracted
  // data so demo or guessed numbers cannot overwrite the source caller number.
  const callbackPhone = input.sourceCallerPhone ?? input.callerPhone;
  if (!callbackPhone) {
    const { error } = await supabase.rpc('record_event_call_outcome', {
      p_organization_id: ORGANIZATION_ID,
      p_location_id: LOCATION_ID,
      p_source_call_id: input.conversationId,
      p_outcome: 'needs_information',
      p_caller_phone: input.sourceCallerPhone,
    });
    if (error) return json(safeFailure(true));
    return json(missingInformation(requestId, ['caller_phone'], 'What phone number should the restaurant use to follow up with you?'));
  }

  if (input.partySize !== null && input.partySize > 8) {
    const { error } = await supabase.rpc('record_event_call_outcome', {
      p_organization_id: ORGANIZATION_ID,
      p_location_id: LOCATION_ID,
      p_source_call_id: input.conversationId,
      p_outcome: 'transfer_required',
      p_caller_phone: input.sourceCallerPhone,
    });
    if (error) return json(safeFailure(true));
    return json(transferRequired(requestId));
  }

  const { data, error } = await supabase.rpc('submit_event_lead', {
    p_organization_id: ORGANIZATION_ID,
    p_location_id: LOCATION_ID,
    p_source_call_id: input.conversationId,
    p_idempotency_key: `${input.conversationId}:event_lead:1`,
    p_caller_phone: callbackPhone,
    p_caller_name: input.callerName,
    p_caller_email: input.callerEmail,
    p_event_type: input.eventType,
    p_event_date: input.eventDate,
    p_event_time: input.eventTime,
    p_party_size: input.partySize,
    p_budget_amount: input.budgetAmount,
    p_budget_currency: input.budgetAmount === null ? null : 'USD',
    p_notes: input.notes,
  });

  if (error || !data || typeof data !== 'object') return json(safeFailure(true));

  const result = data as CallerResponse;
  const allowedStatuses = new Set(['accepted', 'needs_information', 'duplicate', 'transfer_required', 'not_supported', 'failed']);
  if (!allowedStatuses.has(result.status) || typeof result.caller_message !== 'string') return json(safeFailure(true));
  return json({
    status: result.status,
    action: result.action,
    request_id: result.request_id ?? null,
    caller_message: result.caller_message,
    missing_fields: Array.isArray(result.missing_fields) ? result.missing_fields : [],
    transfer_target: null,
    retry_allowed: result.retry_allowed === true,
  });
});
