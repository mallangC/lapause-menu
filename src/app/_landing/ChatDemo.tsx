"use client";

import { useEffect, useRef, useState } from "react";

// 랜딩 '맞춤 상담' 소개 — 매장 첫 화면 대화형 상담(/[slug])의 '추천해주세요' 흐름을 그대로 흉내 내는 자동 재생 대화
// 가게가 입력 중(…)을 거쳐 말을 걸고, 손님 손가락(회색 동그라미)이 답을 눌러 대화가 이어진다.
// 볼륨감 참고 사진 → 금액 → 분위기 사진 → 추천 상품 카드까지 실제 화면의 사진 요소를 보여준다. 끝나면 처음부터 다시.
// 사진은 프리뷰 예시 꽃 사진(public/preview/thumb)

type Card = { img: string; label: string; sub?: string };

type Item =
  | { id: number; from: "shop"; text: string }
  | { id: number; from: "me"; text: string; tight?: boolean }
  | { id: number; from: "meImage"; img: string }
  | { id: number; from: "choices"; list: string[]; stacked: boolean }
  // volume: 가게가 보여주는 볼륨감 참고 사진 / mood: 손님이 고르는 분위기 사진 / product: 추천 상품 카드
  | { id: number; from: "cards"; kind: "volume" | "mood" | "product"; cards: Card[] };

type Step =
  | { wait: number; do: "typing"; label?: string }
  | { wait: number; do: "shop"; text: string }
  | { wait: number; do: "choices"; list: string[]; stacked?: boolean }
  | { wait: number; do: "cards"; kind: "volume" | "mood" | "product"; cards: Card[] }
  | { wait: number; do: "point"; target: string }
  | { wait: number; do: "press" }
  | { wait: number; do: "pick"; say: string; img?: string };

const T = (n: number) => `/preview/thumb/${n}.jpg`;
const PRODUCTS: Card[] = [
  { img: T(4), label: "파스텔 믹스 꽃다발", sub: "70,000원" },
  { img: T(15), label: "로즈 핑크 꽃다발", sub: "75,000원" },
  { img: T(2), label: "핑크 튤립 꽃다발", sub: "80,000원" },
];

const SCRIPT: Step[] = [
  { wait: 500, do: "typing" },
  { wait: 750, do: "shop", text: "안녕하세요, Brand Name입니다." },
  { wait: 300, do: "typing" },
  { wait: 650, do: "shop", text: "예약·주문은 어떤 방식으로 하시겠어요?" },
  { wait: 400, do: "choices", stacked: true, list: ["사장님 스타일로 예쁘게 부탁드려요", "잘 모르겠어요, 추천해주세요", "찾아본 사진이랑 비슷하게 하고 싶어요"] },
  { wait: 850, do: "point", target: "잘 모르겠어요, 추천해주세요" },
  { wait: 500, do: "press" },
  { wait: 170, do: "pick", say: "잘 모르겠어요, 추천해주세요" },
  { wait: 400, do: "typing" },
  { wait: 800, do: "shop", text: "네, 좋아요! 몇 가지만 여쭤보고\n딱 맞는 꽃으로 추천해드릴게요 💐" },
  { wait: 300, do: "typing" },
  { wait: 600, do: "shop", text: "어떤 형태로 찾으세요?" },
  { wait: 400, do: "choices", list: ["꽃다발", "꽃바구니", "센터피스"] },
  { wait: 800, do: "point", target: "꽃다발" },
  { wait: 500, do: "press" },
  { wait: 170, do: "pick", say: "꽃다발" },
  // 볼륨감 참고 사진 — 금액을 정하기 전에
  { wait: 400, do: "typing" },
  { wait: 750, do: "shop", text: "금액 정하실 때 참고하시라고\n볼륨감 참고 이미지 보여드릴게요!" },
  {
    wait: 350,
    do: "cards",
    kind: "volume",
    cards: [
      { img: T(16), label: "미니", sub: "30,000원" },
      { img: T(12), label: "중형", sub: "60,000원" },
      { img: T(6), label: "대형", sub: "100,000원" },
    ],
  },
  { wait: 900, do: "shop", text: "희망 금액은 어느 정도로 생각하세요?" },
  { wait: 400, do: "choices", list: ["5만원", "7만원", "10만원"] },
  { wait: 800, do: "point", target: "7만원" },
  { wait: 500, do: "press" },
  { wait: 170, do: "pick", say: "70,000원 정도 생각하고 있어요" },
  // 분위기 — 사진을 보고 고른다
  { wait: 400, do: "typing" },
  { wait: 750, do: "shop", text: "어떤 분위기가 마음에 드세요?\n사진을 보고 골라주세요." },
  {
    wait: 350,
    do: "cards",
    kind: "mood",
    cards: [
      { img: T(17), label: "깔끔한 화이트&그린" },
      { img: T(4), label: "화사한 파스텔톤" },
      { img: T(9), label: "선명한 비비드톤" },
    ],
  },
  { wait: 950, do: "point", target: "화사한 파스텔톤" },
  { wait: 500, do: "press" },
  { wait: 170, do: "pick", say: "화사한 파스텔톤" },
  // 추천 상품
  { wait: 400, do: "typing", label: "어울리는 꽃 찾는 중" },
  { wait: 1200, do: "shop", text: "이런 꽃은 어떠세요? 💐\n마음에 드는 걸 골라주세요." },
  { wait: 350, do: "cards", kind: "product", cards: PRODUCTS },
  { wait: 1100, do: "point", target: PRODUCTS[0].label },
  { wait: 500, do: "press" },
  { wait: 170, do: "pick", img: PRODUCTS[0].img, say: `‘${PRODUCTS[0].label}’ 이걸로 할게요` },
];
/** 마지막 말 뒤에 잠깐 머물렀다가 처음부터 */
const HOLD = 2800;

export default function ChatDemo() {
  const [items, setItems] = useState<Item[]>([]);
  const [typing, setTyping] = useState<false | { label?: string }>(false);
  const [pointAt, setPointAt] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const nextId = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  // 화면에 보일 때만 재생 — 내려왔을 때 처음 인사부터 보이게 (벗어나면 멈추고 처음으로)
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.35), { threshold: [0, 0.35, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // 처음 상태로
    setItems([]);
    setTyping(false);
    setPointAt(null);
    setPressed(false);
    if (!inView) return;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    const run = () => {
      if (i >= SCRIPT.length) {
        timer = setTimeout(() => {
          setItems([]);
          setTyping(false);
          setPointAt(null);
          setPressed(false);
          i = 0;
          run();
        }, HOLD);
        return;
      }
      const step = SCRIPT[i++];
      timer = setTimeout(() => {
        const id = nextId.current++;
        if (step.do === "typing") setTyping({ label: step.label });
        else if (step.do === "shop") {
          setTyping(false);
          setItems((a) => [...a, { id, from: "shop", text: step.text }]);
        } else if (step.do === "choices") setItems((a) => [...a, { id, from: "choices", list: step.list, stacked: !!step.stacked }]);
        else if (step.do === "cards") setItems((a) => [...a, { id, from: "cards", kind: step.kind, cards: step.cards }]);
        else if (step.do === "point") setPointAt(step.target);
        else if (step.do === "press") setPressed(true);
        else if (step.do === "pick") {
          // 고를 답(버튼·분위기 사진·추천 카드)은 사라지고, 고른 답이 손님 말풍선이 된다 (가게가 보여준 볼륨감 사진은 남는다)
          setPointAt(null);
          setPressed(false);
          const imgId = nextId.current++;
          setItems((a) => [
            ...a.filter((x) => x.from !== "choices" && !(x.from === "cards" && x.kind !== "volume")),
            ...(step.img ? [{ id: imgId, from: "meImage" as const, img: step.img }] : []),
            { id, from: "me" as const, text: step.say, tight: !!step.img },
          ]);
        }
        run();
      }, step.wait);
    };
    run();
    return () => clearTimeout(timer);
  }, [inView]);

  // 가게 말(말풍선·볼륨감 사진)이 연달아 오면 프로필은 첫 것에만
  const isShop = (m: Item) => m.from === "shop" || (m.from === "cards" && m.kind === "volume");
  const firstOfRun = (idx: number) => isShop(items[idx]) && (idx === 0 || !isShop(items[idx - 1]));
  const lastIsShop = items.length > 0 && isShop(items[items.length - 1]);

  const avatar = (
    <span className="shrink-0 w-7 h-7 rounded-full bg-white border border-[#ede3d0] flex items-center justify-center text-[11px] font-semibold text-[#b8934a]">B</span>
  );
  // 손님 손가락 — 회색 동그라미, 누르면 작아진다
  // (나타날 땐 흐려졌다 또렷해지기만 — 등장 애니메이션의 transform이 가운데 맞춤을 덮어쓰지 않게)
  const finger = (
    <span
      className="absolute left-1/2 top-1/2 w-7 h-7 rounded-full pointer-events-none chatdemo-fade"
      style={{ background: "rgba(0,0,0,0.22)", transform: `translate(-50%, -50%) scale(${pressed ? 0.6 : 1})`, transition: "transform .12s ease" }}
    />
  );
  const shopRow = (m: Item, idx: number, children: React.ReactNode) => (
    <div key={m.id} className={`chatdemo-in flex items-start gap-2 ${firstOfRun(idx) && idx > 0 ? "mt-3" : "mt-1.5"}`}>
      {firstOfRun(idx) ? avatar : <span className="shrink-0 w-7" />}
      <div className="min-w-0 flex-1">
        {firstOfRun(idx) && <p className="text-[10.5px] text-[#9a8f80] mb-0.5">Brand Name</p>}
        {children}
      </div>
    </div>
  );

  return (
    <div
      ref={boxRef}
      className="chatdemo w-[clamp(270px,40vw,380px)] h-[46vh] md:h-[clamp(460px,66vh,600px)] rounded-[22px] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.45)] border border-white/10"
      style={{ background: "#faf6ef" }}
    >
      <style>{`
        @keyframes chatdemo-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .chatdemo-in { animation: chatdemo-in .28s ease-out both; }
        @keyframes chatdemo-fade { from { opacity: 0; } to { opacity: 1; } }
        .chatdemo-fade { animation: chatdemo-fade .2s ease-out both; }
        @keyframes chatdemo-dot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
        .chatdemo-dot { animation: chatdemo-dot 1.2s infinite; }
      `}</style>
      {/* 매장 머리글 */}
      <div className="h-11 shrink-0 flex items-center justify-center bg-white border-b border-[#efe8dc]">
        <span className="text-[15px] tracking-wide text-[#2c2416]" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          Brand Name
        </span>
      </div>
      {/* 대화 — 새 말이 아래에 붙고 위의 말은 밀려 올라간다 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-end px-3.5 pb-4 text-[13px] leading-relaxed">
        {items.map((m, idx) => {
          if (m.from === "shop")
            return shopRow(m, idx, <p className="inline-block whitespace-pre-line break-keep px-3 py-2 rounded-2xl rounded-tl-md bg-white text-[#2c2416]">{m.text}</p>);
          if (m.from === "me")
            return (
              <div key={m.id} className={`chatdemo-in flex justify-end ${m.tight ? "mt-1" : "mt-3"}`}>
                <p className="max-w-[82%] break-keep px-3 py-2 rounded-2xl rounded-br-md text-white" style={{ background: "#b8934a" }}>
                  {m.text}
                </p>
              </div>
            );
          if (m.from === "meImage")
            return (
              // 고른 상품 사진 — 손님 말풍선 위에
              <div key={m.id} className="chatdemo-in flex justify-end mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.img} alt="" className="w-28 h-32 rounded-2xl rounded-br-md object-cover" />
              </div>
            );
          if (m.from === "cards" && m.kind === "volume")
            // 볼륨감 참고 사진 — 가게 말풍선 자리에 사진 카드 한 줄
            return shopRow(
              m,
              idx,
              <div className="flex gap-1.5">
                {m.cards.map((c) => (
                  <div key={c.label} className="w-[30%] max-w-[86px] bg-white rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt="" className="w-full aspect-[4/5] object-cover" />
                    <div className="px-1.5 py-1">
                      <p className="text-[9.5px] text-[#9a8f80] leading-tight">{c.label}</p>
                      <p className="text-[10.5px] font-semibold text-[#2c2416] leading-tight">{c.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          if (m.from === "cards")
            // 분위기 사진 / 추천 상품 — 손님이 눌러 고르는 카드 한 줄 (프로필 자리만큼 들여서)
            return (
              <div key={m.id} className="flex gap-1.5 mt-3 pl-9">
                {m.cards.map((c, ci) => {
                  const pointed = pointAt === c.label;
                  return (
                    <div
                      key={c.label}
                      className="chatdemo-in w-[31%] max-w-[92px] bg-white rounded-xl overflow-hidden border transition-colors"
                      style={{ animationDelay: `${ci * 0.06}s`, borderColor: pressed && pointed && m.kind === "mood" ? "#b8934a" : "transparent" }}
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.img} alt="" className="w-full aspect-[4/5] object-cover" />
                        {m.kind === "mood" && pointed && finger}
                      </div>
                      <div className="px-1.5 py-1.5">
                        <p className="text-[9.5px] font-medium text-[#2c2416] leading-tight break-keep">{c.label}</p>
                        {c.sub && <p className="text-[10px] font-semibold text-[#b8934a] leading-tight mt-0.5">{c.sub}</p>}
                        {m.kind === "product" && (
                          <span
                            className="relative mt-1.5 block text-center text-[9.5px] font-medium text-white rounded-md py-1 transition-colors"
                            style={{ background: pressed && pointed ? "#9a7a3a" : "#b8934a" }}
                          >
                            이걸로 할게요
                            {pointed && finger}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          // 고를 답 — 테두리만 있는 버튼, 손가락이 눌러서 고른다
          return (
            <div key={m.id} className={`flex ${m.stacked ? "flex-col items-end" : "justify-end flex-wrap"} gap-1.5 mt-3`}>
              {m.list.map((v, vi) => {
                const pointed = pointAt === v;
                return (
                  <span
                    key={v}
                    className="chatdemo-in relative px-3 py-1.5 rounded-2xl rounded-br-md bg-white border text-[12.5px] font-medium transition-colors"
                    style={{
                      animationDelay: `${vi * 0.06}s`,
                      borderColor: "#c9a96e",
                      color: pressed && pointed ? "white" : "#a07d3c",
                      background: pressed && pointed ? "#b8934a" : "white",
                    }}
                  >
                    {v}
                    {pointed && finger}
                  </span>
                );
              })}
            </div>
          );
        })}
        {/* 가게가 입력 중 */}
        {typing && (
          <div className={`chatdemo-in flex items-start gap-2 ${lastIsShop ? "mt-1.5" : "mt-3"}`}>
            {lastIsShop ? <span className="shrink-0 w-7" /> : avatar}
            <span className="inline-flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-md bg-white">
              {[0, 1, 2].map((d) => (
                <span key={d} className="chatdemo-dot w-1.5 h-1.5 rounded-full bg-[#b8a98f]" style={{ animationDelay: `${d * 0.18}s` }} />
              ))}
              {typing.label && <span className="ml-1.5 text-[11px] text-[#9a8f80]">{typing.label}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
