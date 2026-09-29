export type CallbackNotice = {
  requestId: string;
  sourceCallId: string;
  callerName: string;
  sourceCallerPhone: string | null;
  callbackPhone: string;
  details: string;
  requestCategory: 'general' | 'large_party' | 'complaint' | 'staff_manager';
  recipient: string;
  from: string;
};

const categoryLabels: Record<CallbackNotice['requestCategory'], string> = {
  general: 'Caller follow-up',
  large_party: 'Large party — manager follow-up',
  complaint: 'Major complaint — manager follow-up',
  staff_manager: 'Staff request — manager follow-up',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function buildCallbackEmail(notice: CallbackNotice) {
  const label = categoryLabels[notice.requestCategory];
  const text = [
    label,
    '',
    `Caller: ${notice.callerName}`,
    `Caller ID: ${notice.sourceCallerPhone ?? 'Unavailable'}`,
    `Best callback number: ${notice.callbackPhone}`,
    `Reason: ${notice.details}`,
    `Conversation: ${notice.sourceCallId}`,
    `Request ID: ${notice.requestId}`,
    '',
    'Review and update the callback in the Hostess restaurant desk. This request is not a confirmed reservation.',
  ].join('\n');
  const html = [
    `<h2>${escapeHtml(label)}</h2>`,
    '<dl>',
    `<dt>Caller</dt><dd>${escapeHtml(notice.callerName)}</dd>`,
    `<dt>Caller ID</dt><dd>${escapeHtml(notice.sourceCallerPhone ?? 'Unavailable')}</dd>`,
    `<dt>Best callback number</dt><dd>${escapeHtml(notice.callbackPhone)}</dd>`,
    `<dt>Reason</dt><dd>${escapeHtml(notice.details).replace(/\r?\n/g, '<br>')}</dd>`,
    `<dt>Conversation</dt><dd>${escapeHtml(notice.sourceCallId)}</dd>`,
    `<dt>Request ID</dt><dd>${escapeHtml(notice.requestId)}</dd>`,
    '</dl>',
    '<p>Review this request in the Hostess restaurant desk. This is not a confirmed reservation.</p>',
  ].join('');
  return {
    from: notice.from,
    to: [notice.recipient],
    subject: `[Hostess] ${label}`,
    text,
    html,
  };
}

export async function sendCallbackEmail(
  notice: CallbackNotice,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': `hostess-callback/${notice.requestId}`,
    },
    body: JSON.stringify(buildCallbackEmail(notice)),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !result || typeof result !== 'object' || typeof (result as { id?: unknown }).id !== 'string') {
    throw new Error(`email_provider_${response.status}`);
  }
  return (result as { id: string }).id;
}
