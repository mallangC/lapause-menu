// Gemini 호출 모음 (서버 전용) — 사진 볼륨 가격 판단
// 키는 GEMINI_API_KEY (서버 환경변수). 브라우저에서 부르지 않는다.

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const key = () => {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY가 없어요");
  return k;
};

/** 공개 주소의 사진을 받아 base64로 (볼륨 참고 사진) */
export async function fetchImageBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`사진을 받지 못했어요 ${res.status}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/webp";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mimeType };
}


// ── 사진 주문 볼륨 가격 — 매장 볼륨감 참고 사진(가격 붙음)과 손님 사진을 함께 보여주고, 볼륨만 보고 어느 가격쯤인지 묻는다 ──
/** 볼륨 판단 모델 — 가볍고 빠른 모델 (3.8-flash는 같은 사진도 3.6~10초로 들쭉날쭉, 3.1-flash-lite는 2초 안팎) · 바꿀 때는 환경변수 GEMINI_VISION_MODEL */
export const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.1-flash-lite";

export interface VolumeJudgment {
  /** 꽃 상품 사진인지 (아니면 가격을 내지 않는다) */
  is_flower_product: boolean;
  /** 볼륨이 가장 가까운 참고 사진 번호 (1부터) */
  closest_ref: number;
  /** 예상 가격 범위 (원) */
  price_min: number;
  price_max: number;
  /** 꽃 송이 수 대략 */
  stems_estimate: string;
  confidence: "high" | "medium" | "low";
  /** 판단 근거 한두 줄 (로그 확인용) */
  reason: string;
}

const VOLUME_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_flower_product: { type: "BOOLEAN" },
    closest_ref: { type: "INTEGER" },
    price_min: { type: "INTEGER" },
    price_max: { type: "INTEGER" },
    stems_estimate: { type: "STRING" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    reason: { type: "STRING" },
  },
  required: ["is_flower_product", "closest_ref", "price_min", "price_max", "stems_estimate", "confidence", "reason"],
};

export async function judgeVolumePrice(opts: {
  productType: string;
  refs: { name: string; price: number; base64: string; mimeType: string }[];
  photo: { base64: string; mimeType: string };
}): Promise<VolumeJudgment> {
  const { productType, refs, photo } = opts;
  const n = refs.length;
  const list = refs.map((r, i) => `${i + 1}번: ${r.name} — ${r.price.toLocaleString("ko-KR")}원`).join("\n");
  const prompt = `당신은 꽃집 사장님입니다. 아래 ${n}장은 우리 매장 ${productType}의 볼륨별 참고 사진과 가격이고, 마지막 ${n + 1}번은 손님이 보낸 참고 사진입니다.

${list}
${n + 1}번: 손님 사진

${n + 1}번과 같은 볼륨으로 만들면 우리 매장에서 얼마 정도인지 판단하세요.
- 오직 볼륨으로만 판단합니다: 꽃 송이 수, 꽃 부분의 크기·풍성함, 전체 부피.
- 꽃 종류·색감·포장 스타일·사진 분위기는 가격 판단에 쓰지 마세요.
- 사진마다 찍은 거리가 다르니 포장지 크기, 손·사람·가구 같은 크기 단서를 활용해 실제 크기를 가늠하세요.
- 가격 범위는 참고 사진 가격 사이에서 정하고, 범위 폭은 가장 가까운 두 단계 사이 정도로 좁게 잡으세요.
- 꽃 상품 사진이 아니거나 볼륨을 가늠할 수 없으면 is_flower_product를 false로, 애매하면 confidence를 low로 하세요.
- reason은 한국어 한두 문장.`;

  const parts: unknown[] = [];
  refs.forEach((r, i) => {
    parts.push({ text: `${i + 1}번 (${r.price.toLocaleString("ko-KR")}원)` });
    parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  });
  parts.push({ text: `${n + 1}번 (손님 사진)` });
  parts.push({ inline_data: { mime_type: photo.mimeType, data: photo.base64 } });
  parts.push({ text: prompt });

  const res = await fetch(`${API}/${VISION_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
        // 볼륨만 보면 되니 사진을 낮은 해상도로 읽게 (빠르고 싸다) — 환경변수 GEMINI_MEDIA_RES로 바꿔 볼 수 있다
        ...(process.env.GEMINI_MEDIA_RES !== "default" ? { mediaResolution: process.env.GEMINI_MEDIA_RES || "MEDIA_RESOLUTION_LOW" } : {}),
        responseMimeType: "application/json",
        responseSchema: VOLUME_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`볼륨 판단 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(raw) as VolumeJudgment;
}
