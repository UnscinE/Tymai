const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'; // ตัด 0/1/l/o ที่อ่านสับสน

export function shortId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** id สำหรับ entity ภายในบิล (คน/รายการอาหาร) */
export function entityId(prefix: string): string {
  return `${prefix}_${shortId(8)}`;
}
