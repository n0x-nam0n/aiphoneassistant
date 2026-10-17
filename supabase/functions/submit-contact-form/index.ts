import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('PILOT_EMAIL_FROM') ?? '';
const EMAIL_TO = Deno.env.get('CONTACT_FORM_TO') ?? '';
const allowedOrigins = new Set([
  'https://restaurantaireceptionist.com',
  'https://www.restaurantaireceptionist.com',
  'http://127.0.0.1:8765',
  'http://localhost:8765',
]);

function response(request: Request, body: unknown, status = 200): Response {
  const origin = request.headers.get('origin') ?? '';
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'vary': 'Origin',
  });
  if (allowedOrigins.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-headers', 'authorization, apikey, content-type, x-client-info');
    headers.set('access-control-allow-methods', 'POST, OPTIONS');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response(request, { ok: true });
  if (request.method !== 'POST') return response(request, { error: 'method_not_allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO) {
    return response(request, { error: 'service_unavailable' }, 503);
  }
  const origin = request.headers.get('origin') ?? '';
  if (origin && !allowedOrigins.has(origin)) return response(request, { error: 'origin_not_allowed' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return response(request, { error: 'invalid_request' }, 400);
  }

  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 8_192) return response(request, { error: 'invalid_request' }, 413);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_json');
    input = parsed as Record<string, unknown>;
  } catch {
    return response(request, { error: 'invalid_json' }, 400);
  }

  const name = clean(input.name, 120);
  const businessName = clean(input.business_name, 160);
  const email = clean(input.email, 254);
  const message = clean(input.message, 2_000);
  if (!name || !businessName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response(request, { error: 'invalid_fields' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: submission, error: insertError } = await supabase
    .from('contact_submissions')
    .insert({ name, business_name: businessName, email, message: message || null })
    .select('id')
    .single();
  if (insertError || !submission?.id) return response(request, { error: 'submission_failed' }, 500);

  const safeName = escapeHtml(name);
  const safeBusiness = escapeHtml(businessName);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message || 'No additional details provided.').replace(/\r?\n/g, '<br>');
  const text = [
    'New Hostess website inquiry', '', `Name: ${name}`, `Restaurant: ${businessName}`,
    `Email: ${email}`, '', 'What happens when nobody answers?', message || 'No additional details provided.',
    '', `Submission ID: ${submission.id}`,
  ].join('\n');
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': `hostess-contact/${submission.id}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [EMAIL_TO],
      reply_to: email,
      subject: `[Hostess] Website inquiry from ${businessName}`,
      text,
      html: `<h2>New Hostess website inquiry</h2><dl><dt>Name</dt><dd>${safeName}</dd><dt>Restaurant</dt><dd>${safeBusiness}</dd><dt>Email</dt><dd>${safeEmail}</dd></dl><p><strong>What happens when nobody answers?</strong></p><p>${safeMessage}</p><p>Submission ID: ${submission.id}</p>`,
    }),
  });
  const providerResult: unknown = await emailResponse.json().catch(() => null);
  if (!emailResponse.ok || !providerResult || typeof providerResult !== 'object' || typeof (providerResult as { id?: unknown }).id !== 'string') {
    console.error('Contact notification failed', { status: emailResponse.status, submissionId: submission.id });
    return response(request, { error: 'notification_failed', saved: true }, 502);
  }
  return response(request, { ok: true, notified: true });
});
