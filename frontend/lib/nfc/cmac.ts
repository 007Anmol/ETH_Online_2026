import { createCipheriv } from "node:crypto";

const BLOCK = 16;
const RB = Buffer.from("00000000000000000000000000000087", "hex");

function aes128(key: Buffer, block: Buffer): Buffer {
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
}

function xor(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

function shiftLeft(block: Buffer): Buffer {
  const out = Buffer.alloc(BLOCK);
  let carry = 0;
  for (let i = BLOCK - 1; i >= 0; i -= 1) {
    const nextCarry = block[i] >> 7;
    out[i] = ((block[i] << 1) | carry) & 0xff;
    carry = nextCarry;
  }
  return out;
}

function subkeys(key: Buffer): { k1: Buffer; k2: Buffer } {
  const L = aes128(key, Buffer.alloc(BLOCK, 0));
  let k1 = shiftLeft(L);
  if (L[0] & 0x80) k1 = xor(k1, RB);
  let k2 = shiftLeft(k1);
  if (k1[0] & 0x80) k2 = xor(k2, RB);
  return { k1, k2 };
}

/** AES-128/CMAC (RFC 4493). Used only on the server. */
export function aesCmac(key: Buffer, message: Buffer): Buffer {
  if (key.length !== BLOCK) {
    throw new Error("AES-128 CMAC key must be 16 bytes");
  }

  const { k1, k2 } = subkeys(key);
  const n = message.length === 0 ? 1 : Math.ceil(message.length / BLOCK);
  const complete = message.length > 0 && message.length % BLOCK === 0;
  const lastIndex = n - 1;
  let x = Buffer.alloc(BLOCK, 0);

  for (let i = 0; i < lastIndex; i += 1) {
    const block = message.subarray(i * BLOCK, (i + 1) * BLOCK);
    x = aes128(key, xor(x, block));
  }

  const lastChunk =
    message.length === 0
      ? Buffer.alloc(0)
      : message.subarray(lastIndex * BLOCK);

  let last: Buffer;
  if (complete) {
    last = xor(lastChunk, k1);
  } else {
    const padded = Buffer.alloc(BLOCK, 0);
    lastChunk.copy(padded);
    padded[lastChunk.length] = 0x80;
    last = xor(padded, k2);
  }

  return aes128(key, xor(x, last));
}

export function parseAes128Key(hex: string): Buffer {
  const clean = hex.trim().replace(/^0x/i, "");
  const key = Buffer.from(clean, "hex");
  if (key.length !== BLOCK) {
    throw new Error("NFC master key must be 16-byte hex");
  }
  return key;
}
