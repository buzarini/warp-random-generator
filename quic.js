const crypto = require('crypto');
const { subtle } = crypto.webcrypto;

// Вспомогательные функции (переведены с клиентского кода)
function str8(data) {
  if (!data) return new ArrayBuffer(1);
  const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  const result = Buffer.alloc(input.byteLength + 1);
  result.writeUInt8(input.byteLength, 0);
  input.copy(result, 1);
  return result.buffer;
}

function str16(data) {
  if (!data) return new ArrayBuffer(2);
  const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  const result = Buffer.alloc(input.byteLength + 2);
  result.writeUInt16BE(input.byteLength, 0);
  input.copy(result, 2);
  return result.buffer;
}

function varint(x) {
  if (x < 0x40) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(x, 0);
    return buf.buffer;
  } else if (x < 0x4000) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(x | 0x4000, 0);
    return buf.buffer;
  } else if (x < 0x40000000) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(x | 0x80000000, 0);
    return buf.buffer;
  } else {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(x) | 0xC000000000000000n, 0);
    return buf.buffer;
  }
}

function varintLength(x) {
  if (x < 0x40) return 1;
  if (x < 0x4000) return 2;
  if (x < 0x40000000) return 4;
  return 8;
}

function toHex(buffer) {
  return Buffer.from(buffer).toString('hex');
}

function concatBuffers(buffers, before = 0, after = 0) {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, before + after);
  const result = Buffer.alloc(total);
  let offset = before;
  for (const b of buffers) {
    const buf = Buffer.from(b);
    buf.copy(result, offset);
    offset += buf.length;
  }
  return result.buffer;
}

function xorBuffer(dst, src, dstOffset, srcOffset, len) {
  const dstBuf = Buffer.from(dst);
  const srcBuf = Buffer.from(src);
  for (let i = 0; i < len; i++) {
    dstBuf[dstOffset + i] ^= srcBuf[srcOffset + i];
  }
}

async function hmac(key, buffer) {
  const cryptoKey = key instanceof CryptoKey ? key : await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return subtle.sign('HMAC', cryptoKey, buffer);
}

async function deriveSecret(key, length, label, context = '') {
  const data = concatBuffers([
    str8('tls13 ' + label),
    str8(context),
    new Uint8Array([0x01]),
  ], 2);
  const view = new DataView(data);
  view.setUint16(0, length, false);
  const h = await hmac(key, data);
  return h.slice(0, length);
}

async function encryptPayload(key, payload, iv, aad) {
  const cryptoKey = key instanceof CryptoKey ? key : await subtle.importKey('raw', key, { name: 'AES-GCM', length: 128 }, false, ['encrypt']);
  return subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, cryptoKey, payload);
}

async function deriveHpMask(key, sample) {
  const cryptoKey = key instanceof CryptoKey ? key : await subtle.importKey('raw', key, { name: 'AES-CBC', length: 128 }, false, ['encrypt']);
  const iv = new ArrayBuffer(16);
  return subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, sample);
}

function measureLengths(dcidLen, scidLen, tokenLen, pknLen, payloadLen, padto = 0) {
  const baseHeader = 8 + dcidLen + scidLen + tokenLen + pknLen;
  const tag = 16;
  let padding = 0;

  const getLenByteSize = () => varintLength(pknLen + payloadLen + padding + tag);
  const getOverall = () => baseHeader + getLenByteSize() + payloadLen + padding + tag;

  let overall = getOverall();
  if (overall < padto) {
    padding = padto - overall;
    while (padding && getOverall() > padto) padding--;
    if (getOverall() < padto) padding++;
    overall = getOverall();
  }
  if (pknLen + payloadLen + padding + tag < 20) {
    padding = 20 - pknLen - payloadLen - tag;
    overall = getOverall();
  }
  return {
    total: overall,
    header: baseHeader + getLenByteSize(),
    padding,
  };
}

async function quicInitial(dcid, scid, token, pkn, payload, padto) {
  const lengths = measureLengths(dcid.byteLength, scid.byteLength, token.byteLength, pkn.byteLength, payload.byteLength, padto);
  const header = concatBuffers([
    new Uint8Array([0xC0 | (pkn.byteLength - 1), 0, 0, 0, 1]),
    str8(dcid),
    str8(scid),
    str8(token),
    varint(pkn.byteLength + payload.byteLength + lengths.padding + 16),
    pkn,
  ]);

  // Получение ключей
  const quicSalt = new Uint8Array([
    0x38, 0x76, 0x2c, 0xf7, 0xf5, 0x59, 0x34, 0xb3, 0x4d, 0x17,
    0x9a, 0xe6, 0xa4, 0xc8, 0x0c, 0xad, 0xcc, 0xbb, 0x7f, 0x0a,
  ]);
  const quicHmacKey = await subtle.importKey('raw', quicSalt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const initSecret = await hmac(quicHmacKey, dcid);
  const clientSecret = await deriveSecret(initSecret, 32, 'client in');
  const quicKey = await deriveSecret(clientSecret, 16, 'quic key');
  const quicIv = await deriveSecret(clientSecret, 12, 'quic iv');
  const quicHp = await deriveSecret(clientSecret, 16, 'quic hp');

  // Xor IV с PKN
  xorBuffer(quicIv, pkn, 12 - pkn.byteLength, 0, pkn.byteLength);

  // Заполнение и шифрование
  const paddedPayload = concatBuffers([payload], 0, lengths.padding);
  const encryptedPayload = await encryptPayload(quicKey, paddedPayload, quicIv, header);

  // Защита заголовка
  const mask = new Uint8Array(await deriveHpMask(quicHp, encryptedPayload.slice(4 - pkn.byteLength, 20 - pkn.byteLength)));
  mask[0] &= 0x0f;
  xorBuffer(header, mask, 0, 0, 1);
  xorBuffer(header, mask, header.byteLength - pkn.byteLength, 1, pkn.byteLength);

  return concatBuffers([header, encryptedPayload]);
}

function cryptoFrame(data, offset = 0) {
  return concatBuffers([
    new Uint8Array([0x06]),
    varint(offset),
    varint(data.byteLength),
    data,
  ]);
}

function tlsExt(code, content) {
  const result = concatBuffers([content], 4);
  const view = new DataView(result);
  view.setUint16(0, code, false);
  view.setUint16(2, content.byteLength, false);
  return result;
}

function tlsExtSni(sni) {
  const sniBuffer = str16(sni);
  const extBuffer = concatBuffers([sniBuffer], 3);
  const view = new DataView(extBuffer);
  view.setUint16(0, sniBuffer.byteLength + 1, false);
  view.setUint8(2, 0);
  return tlsExt(0, extBuffer);
}

function tlsClientHelloSniOnly(sni, predefinedRandom = null) {
  const randomBytes = predefinedRandom ? Buffer.from(predefinedRandom) : crypto.randomBytes(32);
  const payload = concatBuffers([
    new Uint8Array([0x03, 0x03]),
    randomBytes,
    new Uint8Array([0, 0, 0, 0]),
    str16(tlsExtSni(sni)),
  ], 4);
  const view = new DataView(payload);
  view.setUint32(0, payload.byteLength - 4, false);
  view.setUint8(0, 0x01);
  return payload;
}

function tlsClientHelloToFrames(clientHello, level) {
  let payload;
  let cutSettings;
  if (!level) {
    payload = cryptoFrame(clientHello);
    const dataOffset = payload.byteLength - clientHello.byteLength;
    cutSettings = [dataOffset + 6, 32, clientHello.byteLength - 38, 16];
  } else {
    const cutPresets = {
      1: [38, Infinity, 0, 38, 32, false],
      2: [38, Infinity, 0, 38, 37, false],
      3: [0, 1, 38, Infinity, 0, false],
      4: [0, 1, 38, Infinity, 0, true],
    };
    let [p1s, p1e, p2s, p2e, dropTail, skipZeroes] = cutPresets[level];
    if (skipZeroes) {
      const h8u = new Uint8Array(clientHello);
      while (h8u[p2s] === 0) p2s++;
    }
    payload = concatBuffers([
      cryptoFrame(clientHello.slice(p1s, p1e), p1s),
      cryptoFrame(clientHello.slice(p2s, p2e), p2s),
    ]);
    cutSettings = [payload.byteLength - dropTail, 16 + dropTail];
  }
  return [payload, cutSettings];
}

function fixCutSettings(cutSettings, packetLen, pknLen, payloadLen) {
  if (cutSettings[0] < 20 - pknLen) {
    const add = 20 - pknLen - cutSettings[0];
    cutSettings[0] += add;
    cutSettings[1] -= add;
  }
  cutSettings[0] += packetLen - payloadLen - 16;
}

function toAWG(buffer, parts = null, includeFirst = true) {
  let include = includeFirst;
  let offset = 0;
  let result = '';
  if (!parts) return `<b 0x${toHex(buffer)}>`;
  for (const part of parts) {
    if (part > 0) {
      if (include) {
        result += `<b 0x${toHex(buffer.slice(offset, offset + part))}>`;
      } else {
        result += `<r ${part}>`;
      }
      offset += part;
    }
    include = !include;
  }
  return result;
}

// Основная функция генерации I1
async function generateI1(domain, level) {
  const dcid = crypto.randomBytes(1);
  const scid = Buffer.alloc(0);
  const token = Buffer.alloc(0);
  const pkn = new Uint8Array([0]);
  const clientHello = tlsClientHelloSniOnly(domain);
  const [payload, cutSettings] = tlsClientHelloToFrames(clientHello, level);
  const packet = await quicInitial(dcid, scid, token, pkn, payload, 0);
  fixCutSettings(cutSettings, packet.byteLength, pkn.byteLength, payload.byteLength);
  return toAWG(packet, cutSettings);
}

module.exports = { generateI1 };