import { createHmac, timingSafeEqual } from 'node:crypto';
import { BANK_VERSION, FAMILIES } from '../src/content/bank';
type Ticket = { player: string; id: string; seed: number; exp: number; bank: number };
export function issueTicket(
  secret: string,
  player: string,
  id: string,
  seed: number,
  now = Date.now(),
): string {
  const payload = Buffer.from(
    JSON.stringify({ player, id, seed, exp: now + 2 * 60 * 60 * 1000, bank: BANK_VERSION }),
  ).toString('base64url');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}
export function verifyTicket(
  secret: string,
  value: unknown,
  player: string,
  now = Date.now(),
): Ticket {
  if (typeof value !== 'string' || value.length > 1000) throw new Error('Invalid question ticket');
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid question ticket');
  const expected = createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw new Error('Invalid question ticket');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Ticket;
  if (
    parsed.player !== player ||
    parsed.bank !== BANK_VERSION ||
    !Number.isFinite(parsed.exp) ||
    parsed.exp <= now ||
    !Number.isInteger(parsed.seed) ||
    parsed.seed < 0 ||
    parsed.seed > 0xffffffff ||
    !FAMILIES.some((f) => f.id === parsed.id)
  )
    throw new Error('Expired or invalid question ticket');
  return parsed;
}
