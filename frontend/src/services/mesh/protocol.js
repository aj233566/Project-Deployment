// SENETRY nearby network: the messages phones pass to each other, and the rules that keep them honest.
//
// What travels is a small signed "envelope". Two kinds of sender exist:
//   - the SERVER signs alerts. Every phone trusts one pinned server key, so no phone can forge or edit an alert while carrying it.
//   - a DEVICE signs its own reports, location updates and "I am safe" messages. The server only accepts them from devices it knows.
// Phones that carry a message for someone else cannot change it: any edit breaks the signature. They also cannot read more than the
// envelope holds, and an envelope holds nothing but SENETRY data. Hops, the number of times a message may still be passed on, sit outside
// the signature on purpose, because every carrier lowers it.
//
// Signatures are ECDSA P-256 with SHA-256 (WebCrypto, available in every Android WebView and in Node). Nothing here touches Bluetooth.

export const LIMITS = Object.freeze({
  maxBytes: 2048, // one envelope, as JSON
  maxHops: 6,
  maxLifetimeMs: 48 * 3600 * 1000,
  clockSkewMs: 5 * 60 * 1000,
  storeCap: 200,
  perSenderPerMinute: 12,
});

export const SERVER_KINDS = ['alert'];
export const DEVICE_KINDS = ['report', 'location', 'safe'];
const LEVELS = ['critical', 'high', 'info'];

const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

// ---- encoding ------------------------------------------------------------------------------------------------------------------

// The same value always gives the same text: keys sorted, no whitespace. Numbers must be finite, and undefined is not allowed.
export function canonical(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('number-not-finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => {
      if (value[k] === undefined) throw new Error('undefined-value');
      return `${JSON.stringify(k)}:${canonical(value[k])}`;
    }).join(',')}}`;
  }
  throw new Error('unsupported-value');
}

export const toBase64 = (bytes) => {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return globalThis.btoa(s);
};
export const fromBase64 = (text) => Uint8Array.from(globalThis.atob(text), (c) => c.charCodeAt(0));
const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(text, bytes = 16) {
  return toHex(await subtle().digest('SHA-256', enc.encode(text))).slice(0, bytes * 2);
}

// ---- keys ----------------------------------------------------------------------------------------------------------------------

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };

// A device key pair. `jwk` is what the phone keeps in its private storage; `pub` is the 65-byte public key as base64.
export async function generateDeviceKey() {
  const pair = await subtle().generateKey(ALGO, true, ['sign', 'verify']);
  const jwk = await subtle().exportKey('jwk', pair.privateKey);
  const pub = toBase64(await subtle().exportKey('raw', pair.publicKey));
  return { jwk, pub, id: await deviceIdOf(pub) };
}

export async function importPrivate(jwk) {
  return subtle().importKey('jwk', jwk, ALGO, false, ['sign']);
}

export async function importPublic(pubBase64) {
  return subtle().importKey('raw', fromBase64(pubBase64), ALGO, false, ['verify']);
}

// A device is known by the first 16 bytes of the SHA-256 of its public key, in hex.
export async function deviceIdOf(pubBase64) {
  return toHex(await subtle().digest('SHA-256', fromBase64(pubBase64))).slice(0, 32);
}

// ---- envelopes -----------------------------------------------------------------------------------------------------------------

// The part that is signed. `hops` and `sig` are not in it.
export function signedPart(env) {
  const part = { v: env.v, kind: env.kind, from: env.from, ts: env.ts, exp: env.exp, body: env.body };
  if (env.pub !== undefined) part.pub = env.pub;
  return part;
}

// The id is the hash of the signed part, so two copies of one message always share an id and an edited copy gets a different one.
export async function envelopeId(env) {
  return sha256Hex(canonical(signedPart(env)));
}

// Builds and signs an envelope. `signer` is { privateKey (CryptoKey), from, pub? }.
export async function makeEnvelope({ kind, body, ts, exp, hops = LIMITS.maxHops }, signer) {
  const env = { v: 1, kind, from: signer.from, ts, exp, body };
  if (signer.pub !== undefined) env.pub = signer.pub;
  const id = await envelopeId(env);
  const sig = toBase64(await subtle().sign(SIGN, signer.privateKey, enc.encode(canonical(signedPart(env)))));
  return { ...env, id, sig, hops };
}

const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const validLat = (v) => isNum(v) && v >= -90 && v <= 90;
const validLng = (v) => isNum(v) && v >= -180 && v <= 180;

// Is the body the right shape for its kind? Returns an error code, or '' when it is fine.
export function bodyProblem(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'body-shape';
  if (kind === 'alert') {
    if (!LEVELS.includes(body.level) || !isStr(body.title, 120) || !isStr(body.message, 400)) return 'alert-body';
    if (body.alertId !== undefined && !isStr(body.alertId, 64)) return 'alert-body';
    return '';
  }
  if (kind === 'report') {
    if (!isStr(body.incidentType, 40) || !isStr(body.severity, 16) || !validLat(body.lat) || !validLng(body.lng)) return 'report-body';
    if (body.description !== undefined && !(typeof body.description === 'string' && body.description.length <= 300)) return 'report-body';
    return '';
  }
  if (kind === 'location') {
    return validLat(body.lat) && validLng(body.lng) && isNum(body.accuracy) && body.accuracy >= 0 ? '' : 'location-body';
  }
  if (kind === 'safe') {
    if (body.lat !== undefined && !validLat(body.lat)) return 'safe-body';
    if (body.lng !== undefined && !validLng(body.lng)) return 'safe-body';
    return '';
  }
  return 'kind';
}

// Everything that can be checked without a key: size, shape, time, hops, id. Returns an error code, or ''.
export async function shapeProblem(env, now) {
  if (!env || typeof env !== 'object') return 'shape';
  if (env.v !== 1) return 'version';
  if (![...SERVER_KINDS, ...DEVICE_KINDS].includes(env.kind)) return 'kind';
  if (!isStr(env.id, 64) || !isStr(env.from, 64) || !isStr(env.sig, 200)) return 'shape';
  if (!isNum(env.ts) || !isNum(env.exp)) return 'time';
  if (!Number.isInteger(env.hops) || env.hops < 0 || env.hops > LIMITS.maxHops) return 'hops';
  if (env.ts > now + LIMITS.clockSkewMs) return 'future';
  if (env.exp <= now) return 'expired';
  if (env.exp - env.ts > LIMITS.maxLifetimeMs || env.exp <= env.ts) return 'lifetime';
  const text = JSON.stringify(env);
  if (text.length > LIMITS.maxBytes) return 'too-big';
  if (SERVER_KINDS.includes(env.kind) && env.pub !== undefined) return 'shape';
  if (DEVICE_KINDS.includes(env.kind) && !isStr(env.pub, 128)) return 'shape';
  const body = bodyProblem(env.kind, env.body);
  if (body) return body;
  try {
    if (env.id !== await envelopeId(env)) return 'id-mismatch';
  } catch {
    return 'shape';
  }
  return '';
}

// Full check. `serverPub` is the pinned server public key (base64) that alerts must be signed with.
// A device envelope must also be signed by the key it carries, and `from` must be that key's id. That proves the message was not changed on
// the way; the server later checks the device is one it knows.
export async function verifyEnvelope(env, { serverPub, now = Date.now() }) {
  const problem = await shapeProblem(env, now);
  if (problem) return { ok: false, reason: problem };
  try {
    let pub;
    if (SERVER_KINDS.includes(env.kind)) {
      if (!serverPub) return { ok: false, reason: 'no-server-key' };
      if (env.from !== 'server') return { ok: false, reason: 'not-from-server' };
      pub = serverPub;
    } else {
      pub = env.pub;
      if (env.from !== await deviceIdOf(pub)) return { ok: false, reason: 'from-mismatch' };
    }
    const key = await importPublic(pub);
    const good = await subtle().verify(SIGN, key, fromBase64(env.sig), enc.encode(canonical(signedPart(env))));
    return good ? { ok: true, reason: '' } : { ok: false, reason: 'bad-signature' };
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }
}
