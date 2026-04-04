export function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDesiredDate(dateStr: string, timeStr?: string | null) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = DAY_KO[date.getDay()];
  const base = `${m}/${d}(${day})`;
  if (!timeStr) return base;
  const [h, min] = timeStr.split(":").map(Number);
  const ampm = h < 12 ? "오전" : "오후";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${base} ${ampm} ${hour}:${String(min).padStart(2, "0")}`;
}

export function formatDateHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = DAY_KO[date.getDay()];
  return `${m}/${d}(${day})`;
}

export function formatTimeOnly(timeStr?: string | null) {
  if (!timeStr) return "";
  const [h, min] = timeStr.split(":").map(Number);
  const ampm = h < 12 ? "오전" : "오후";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hour}:${String(min).padStart(2, "0")}`;
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("02")) {
    if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return phone;
}
