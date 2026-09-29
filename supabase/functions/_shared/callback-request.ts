export type CallbackRequestInput = {
  conversationId: string;
  sourceCallerPhone: string | null;
  callbackPhone: string | null;
  callerName: string | null;
  details: string | null;
  requestCategory: 'general' | 'large_party' | 'complaint' | 'staff_manager';
};

const ALLOWED_KEYS = new Set([
  'conversation_id',
  'source_caller_phone',
  'callback_phone',
  'caller_name',
  'details',
  'request_category',
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const LINE_BREAKS = /[\r\n\u2028\u2029]+/g;

function textField(value: unknown, max: number, multiline = false): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('invalid_type');
  let normalized = value.normalize('NFKC').replace(CONTROL_CHARS, '').trim();
  if (!multiline) normalized = normalized.replace(LINE_BREAKS, ' ');
  if (!normalized) return null;
  if (normalized.length > max) throw new Error('too_long');
  return normalized;
}

export function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const withoutExtension = value.replace(/(?:ext\.?|x)\s*\d+$/i, '').trim();
  const hasPlus = withoutExtension.startsWith('+');
  const digits = withoutExtension.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return `${hasPlus ? '+' : ''}${digits}`;
}

export function parseCallbackRequest(body: unknown): CallbackRequestInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_body');
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error('unexpected_field');
  }

  const conversationId = textField(record.conversation_id, 200);
  if (!conversationId || !/^conv_[A-Za-z0-9_-]+$/.test(conversationId)) throw new Error('invalid_conversation');
  const sourceCallerPhone = normalizePhone(textField(record.source_caller_phone, 40));
  const callbackPhone = normalizePhone(textField(record.callback_phone, 40));
  const callerName = textField(record.caller_name, 160);
  const details = textField(record.details, 2000, true);
  if (!callbackPhone) throw new Error('invalid_callback_phone');
  if (!callerName) throw new Error('missing_caller_name');
  if (!details) throw new Error('missing_details');
  const category = record.request_category ?? 'general';
  if (category !== 'general' && category !== 'large_party' && category !== 'complaint' && category !== 'staff_manager') {
    throw new Error('invalid_request_category');
  }
  return { conversationId, sourceCallerPhone, callbackPhone, callerName, details, requestCategory: category };
}

export function callbackAccepted(requestId: string | null): Record<string, unknown> {
  return {
    status: 'accepted',
    action: 'callback_request_received',
    request_id: requestId,
    caller_message: 'I’ve recorded your callback request and notified the restaurant team. They’ll follow up as soon as they can.',
    retry_allowed: false,
  };
}

export function callbackDuplicate(requestId: string | null): Record<string, unknown> {
  return {
    status: 'duplicate',
    action: 'callback_request_already_received',
    request_id: requestId,
    caller_message: 'I already have your callback request, and the restaurant team has been notified. They’ll follow up as soon as they can.',
    retry_allowed: false,
  };
}

export function callbackNotificationFailed(requestId: string): Record<string, unknown> {
  return {
    status: 'notification_failed',
    action: 'callback_saved_notification_failed',
    request_id: requestId,
    caller_message: 'I have your details, but I could not confirm that the restaurant team was alerted. Please try again later.',
    retry_allowed: true,
  };
}
