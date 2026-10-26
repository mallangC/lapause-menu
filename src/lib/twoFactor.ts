import crypto from "crypto";

export const DEVICE_COOKIE_NAME = "fa_device";
export const REMEMBER_DAYS = 30;
export const UNREMEMBERED_HOURS = 12; // "기억하기" 미선택 시 세션 유지 시간
export const CODE_TTL_MINUTES = 5;
export const RESEND_COOLDOWN_SECONDS = 30;

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export function generateDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
