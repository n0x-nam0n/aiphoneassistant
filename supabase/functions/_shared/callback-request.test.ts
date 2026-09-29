import assert from 'node:assert/strict';
import test from 'node:test';
import { callbackAccepted, callbackDuplicate, callbackNotificationFailed, parseCallbackRequest } from './callback-request.ts';

const valid = {
  conversation_id: 'conv_abc123',
  source_caller_phone: '+1 (310) 555-0142',
  callback_phone: '310-555-0199',
  caller_name: '  Ada Lovelace  ',
  details: 'Wants to speak with someone about a reservation.\nParty of 4, Saturday evening.',
  request_category: 'general',
};

test('normalizes source and callback phones separately and trims caller details', () => {
  assert.deepEqual(parseCallbackRequest(valid), {
    conversationId: 'conv_abc123',
    sourceCallerPhone: '+13105550142',
    callbackPhone: '3105550199',
    useSourceCallerId: false,
    callerName: 'Ada Lovelace',
    details: 'Wants to speak with someone about a reservation.\nParty of 4, Saturday evening.',
    requestCategory: 'general',
  });
});

test('uses caller ID only after explicit caller consent', () => {
  const parsed = parseCallbackRequest({
    ...valid,
    callback_phone: undefined,
    use_source_caller_id: true,
  });
  assert.equal(parsed.callbackPhone, '+13105550142');
  assert.equal(parsed.useSourceCallerId, true);
  assert.throws(() => parseCallbackRequest({ ...valid, use_source_caller_id: true }), /conflicting_callback_phone/);
  assert.throws(() => parseCallbackRequest({
    ...valid,
    source_caller_phone: null,
    callback_phone: undefined,
    use_source_caller_id: true,
  }), /invalid_callback_phone/);
});

test('rejects missing, invalid, and unexpected fields', () => {
  assert.throws(() => parseCallbackRequest({ ...valid, callback_phone: '123' }), /invalid_callback_phone/);
  assert.throws(() => parseCallbackRequest({ ...valid, caller_name: ' ' }), /missing_caller_name/);
  assert.throws(() => parseCallbackRequest({ ...valid, details: ' ' }), /missing_details/);
  assert.throws(() => parseCallbackRequest({ ...valid, transfer_number: '+13108090620' }), /unexpected_field/);
  assert.throws(() => parseCallbackRequest({ ...valid, request_category: 'transfer' }), /invalid_request_category/);
});

test('rejects overlong caller-controlled data', () => {
  assert.throws(() => parseCallbackRequest({ ...valid, details: 'x'.repeat(2001) }), /too_long/);
});

test('returns caller-safe success messages with idempotent request IDs', () => {
  assert.equal(callbackAccepted('request-1').status, 'accepted');
  assert.equal(callbackDuplicate('request-1').status, 'duplicate');
  assert.equal(callbackAccepted('request-1').request_id, callbackDuplicate('request-1').request_id);
  assert.match(String(callbackAccepted('request-1').caller_message), /notified the restaurant team/);
  assert.equal(callbackNotificationFailed('request-1').status, 'notification_failed');
  assert.doesNotMatch(String(callbackNotificationFailed('request-1').caller_message), /team has been notified/i);
  assert.match(String(callbackNotificationFailed('request-1').caller_message), /can’t promise a callback/);
  assert.equal(callbackNotificationFailed('request-1').retry_allowed, false);
});
