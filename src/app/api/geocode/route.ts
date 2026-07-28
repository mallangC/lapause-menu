import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 자사 도메인 요청만 허용
  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  const allowed = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (allowed && !origin.startsWith(allowed)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
  if (address.length > 200) return NextResponse.json({ error: "address too long" }, { status: 400 });

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return NextResponse.json({ error: "kakao key not configured" }, { status: 500 });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    { headers: { Authorization: `KakaoAK ${key}` } }
  );
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x) });
}
