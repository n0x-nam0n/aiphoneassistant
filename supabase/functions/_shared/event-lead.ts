export type JsonRecord = Record<string, unknown>;

export type EventLeadInput = {
  conversationId: string;
  sourceCallerPhone: string | null;
  callerPhone: string | null;
  callerName: string | null;
  callerEmail: string | null;
  eventType: string | null;
  eventDate: string | null;
  eventTime: string | null;
  partySize: number | null;
  budgetAmount: number | null;
  notes: string | null;
};

export type CallerResponse = {
  status: 'accepted' | 'needs_information' | 'duplicate' | 'transfer_required' | 'not_supported' | 'failed';
  action: string;
  request_id: string | null;
  caller_message: string;
  missing_fields: string[];
  transfer_target: null;
  retry_allowed: boolean;
};

const ALLOWED_KEYS = new Set([
  'conversation_id',
  'source_caller_phone',
  'caller_phone',
  'caller_name',
  'caller_email',
  'event_type',
  'event_date',
  'event_time',
  'party_size',
  'budget_amount',
  'notes',
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SINGLE_LINE_BREAKS = /[\r\n\u2028\u2029]+/g;

function optionalString(value: unknown, max: number, singleLine = true): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('invalid_type');
  let normalized = value.normalize('NFKC').replace(CONTROL_CHARS, '');
  if (singleLine) normalized = normalized.replace(SINGLE_LINE_BREAKS, ' ');
  normalized = normalized.trim();
  if (!normalized) return null;
  if (normalized.length > max) throw new Error('too_long');
  return normalized;
}

function optionalInteger(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error('invalid_number');
  return parsed;
}

function optionalMoney(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) throw new Error('invalid_money');
  return Math.round(parsed * 100) / 100;
}

export function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const extensionRemoved = value.replace(/(?:ext\.?|x)\s*\d+$/i, '').trim();
  const hasPlus = extensionRemoved.startsWith('+');
  const digits = extensionRemoved.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return `${hasPlus ? '+' : ''}${digits}`;
}

export function trustedLocalDate(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
}

function resolveEventDate(value: string, timeZone: string, now: Date): string {
  if (isCalendarDate(value)) return value;
  const relativeDays: Record<string, number> = {
    today: 0,
    tomorrow: 1,
    'day after tomorrow': 2,
  };
  const offset = relativeDays[value.trim().toLocaleLowerCase()];
  if (offset === undefined) throw new Error('invalid_date');
  const [year, month, day] = trustedLocalDate(timeZone, now).split('-').map(Number);
  const localCalendarDay = new Date(Date.UTC(year, month - 1, day + offset));
  return localCalendarDay.toISOString().slice(0, 10);
}

export function parseEventLead(body: unknown, timeZone: string, now = new Date()): EventLeadInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_body');
  const record = body as JsonRecord;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error('unexpected_field');
  }

  const conversationId = optionalString(record.conversation_id, 200);
  if (!conversationId || !/^conv_[A-Za-z0-9_-]+$/.test(conversationId)) throw new Error('invalid_conversation');

  const sourceCallerPhone = normalizePhone(optionalString(record.source_caller_phone, 40));
  const callerPhone = normalizePhone(optionalString(record.caller_phone, 40));
  const callerName = optionalString(record.caller_name, 160);
  const callerEmail = optionalString(record.caller_email, 320);
  if (callerEmail && !/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(callerEmail)) throw new Error('invalid_email');

  const eventType = optionalString(record.event_type, 120)?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || null;
  const rawEventDate = optionalString(record.event_date, 40);
  const eventDate = rawEventDate ? resolveEventDate(rawEventDate, timeZone, now) : null;
  if (eventDate && eventDate < trustedLocalDate(timeZone, now)) throw new Error('past_date');

  const eventTime = optionalString(record.event_time, 5);
  if (eventTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(eventTime)) throw new Error('invalid_time');

  return {
    conversationId,
    sourceCallerPhone,
    callerPhone,
    callerName,
    callerEmail,
    eventType,
    eventDate,
    eventTime,
    partySize: optionalInteger(record.party_size, 1, 500),
    budgetAmount: optionalMoney(record.budget_amount),
    notes: optionalString(record.notes, 1000, false),
  };
}

export function missingInformation(requestId: string | null, fields: string[], message: string): CallerResponse {
  return {
    status: 'needs_information',
    action: 'collect_missing_details',
    request_id: requestId,
    caller_message: message,
    missing_fields: fields,
    transfer_target: null,
    retry_allowed: true,
  };
}

export function safeFailure(retryAllowed = true): CallerResponse {
  return {
    status: 'failed',
    action: 'request_not_processed',
    request_id: null,
    caller_message: 'I couldn’t send that inquiry just now. Please contact the restaurant directly.',
    missing_fields: [],
    transfer_target: null,
    retry_allowed: retryAllowed,
  };
}

export function transferRequired(requestId: string): CallerResponse {
  return {
    status: 'transfer_required',
    action: 'human_review_required',
    request_id: requestId,
    caller_message: 'That request needs review by the restaurant team. I can collect your details, but I can’t confirm availability or a booking.',
    missing_fields: [],
    transfer_target: null,
    retry_allowed: false,
  };
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}
