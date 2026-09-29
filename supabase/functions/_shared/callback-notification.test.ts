import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCallbackEmail, sendCallbackEmail, type CallbackNotice } from './callback-notification.ts';

const notice: CallbackNotice = {
  requestId: 'request-123',
  sourceCallId: 'conv_123456',
  callerName: 'Jane Caller',
  sourceCallerPhone: '+13105550100',
  callbackPhone: '+13105550101',
  details: 'Reservation for 10 guests\n<script>alert(1)</script>',
  requestCategory: 'large_party',
  recipient: 'owner@example.com',
  from: 'Hostess <notifications@example.com>',
};

test('notification uses trusted recipient and safely encodes caller details', () => {
  const email = buildCallbackEmail(notice);
  assert.deepEqual(email.to, ['owner@example.com']);
  assert.match(email.subject, /Large party/);
  assert.match(email.text, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
});

test('Resend request is idempotent for the callback request ID', async () => {
  let captured: RequestInit | undefined;
  const messageId = await sendCallbackEmail(notice, 'not-a-real-key', async (_input, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 'email-123' }), { status: 200 });
  });
  assert.equal(messageId, 'email-123');
  const headers = new Headers(captured?.headers);
  assert.equal(headers.get('idempotency-key'), 'hostess-callback/request-123');
  assert.equal(headers.get('authorization'), 'Bearer not-a-real-key');
});

test('provider errors are not reported as sent', async () => {
  await assert.rejects(
    sendCallbackEmail(notice, 'not-a-real-key', async () => new Response('{}', { status: 503 })),
    /email_provider_503/,
  );
});
