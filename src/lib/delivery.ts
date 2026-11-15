// 배송비 — 매장 주소와 받는 주소의 직선거리로 정한다 (맞춤주문·장바구니 결제 화면 공통)

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 거리(km)에 맞는 배송비 — 사장님이 정한 구간 밖이면 null (매장 문의) */
export function deliveryFeeFor(km: number, fees: Record<string, number>): number | null {
  const key = km <= 1 ? "0-1" : km <= 3 ? "1-3" : km <= 5 ? "3-5" : km <= 10 ? "5-10" : km <= 15 ? "10-15" : km <= 20 ? "15-20" : null;
  if (!key) return null;
  return fees[key] ?? null;
}

/** 매장 → 받는 주소 직선거리(소수 첫째 자리)와 배송비. 주소를 찾지 못하면 null */
export async function measureDelivery(storeAddress: string, address: string, fees: Record<string, number>): Promise<{ km: number; fee: number | null } | null> {
  const [from, to] = await Promise.all([geocode(storeAddress), geocode(address)]);
  if (!from || !to) return null;
  const km = Math.round(haversineKm(from.lat, from.lng, to.lat, to.lng) * 10) / 10;
  return { km, fee: deliveryFeeFor(km, fees) };
}
