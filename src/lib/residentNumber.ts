import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.RESIDENT_NUMBER_ENC_KEY;
  if (!raw) throw new Error("RESIDENT_NUMBER_ENC_KEY가 설정되지 않았습니다.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("RESIDENT_NUMBER_ENC_KEY는 base64로 인코딩된 32바이트 키여야 합니다.");
  return key;
}

// 주민등록번호 13자리(앞6+뒤7, 하이픈 없이)를 암호화해 "iv:authTag:ciphertext"(base64) 형식으로 반환
export function encryptResidentNumber(full: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(full, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

// 서버 내부에서만 사용 — 복호화된 평문을 클라이언트로 그대로 내려보내지 않는다.
export function decryptResidentNumber(enc: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = enc.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

// 앞자리 6자리는 전부 노출, 뒷자리 7자리 중 첫 1자리만 노출하고 나머지는 ● 마스킹 (운영자/판매자 공용 조회 포맷)
export function maskResidentNumber(full: string): string {
  const front = full.slice(0, 6);
  const back = full.slice(6);
  return `${front}-${back[0] ?? ""}${"●".repeat(Math.max(0, back.length - 1))}`;
}

export function isValidResidentNumberFormat(front: string, back: string): boolean {
  return /^\d{6}$/.test(front) && /^\d{7}$/.test(back);
}
