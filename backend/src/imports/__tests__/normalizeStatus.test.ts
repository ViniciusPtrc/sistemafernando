import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReceivableStatus } from '../normalizeStatus';

test('mapeia variações conhecidas para o status canônico', () => {
  assert.equal(normalizeReceivableStatus('Pago').status, 'paid');
  assert.equal(normalizeReceivableStatus('BAIXADO').status, 'paid');
  assert.equal(normalizeReceivableStatus('Liquidado').status, 'paid');
  assert.equal(normalizeReceivableStatus('Em aberto').status, 'pending');
  assert.equal(normalizeReceivableStatus('A Receber').status, 'pending');
  assert.equal(normalizeReceivableStatus('Vencido').status, 'overdue');
  assert.equal(normalizeReceivableStatus('Em atraso').status, 'overdue');
  assert.equal(normalizeReceivableStatus('Cancelado').status, 'canceled');
  assert.equal(normalizeReceivableStatus('Estornado').status, 'canceled');
});

test('sem texto de status => null (adaptador decide pelo contexto)', () => {
  assert.deepEqual(normalizeReceivableStatus(''), { status: null });
  assert.deepEqual(normalizeReceivableStatus(null), { status: null });
  assert.deepEqual(normalizeReceivableStatus(undefined), { status: null });
});

test('status desconhecido => sinaliza unknown, não engole a linha', () => {
  const r = normalizeReceivableStatus('Renegociado Judicialmente');
  assert.equal(r.status, null);
  assert.equal(r.unknown, 'Renegociado Judicialmente');
});
