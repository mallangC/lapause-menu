"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { photoOrderKey, PHOTO_MOOD_SAME, STYLE_MOODS, STYLE_MOOD_TRUST, styleOrderHref, type StyleKind } from "@/lib/styleOrder";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
import StoreFooter, { type StoreFooterProps } from "@/components/main/StoreFooter";
import SizeGuideButton from "@/components/SizeGuideButton";
import { sizeForPrice, type SizeTier } from "@/lib/sizeTiers";

interface Props {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  consultEnabled: boolean;
  /** 첫 인사에 곁들일 매장 작품 사진 (최대 3장) */
  photos: string[];
  /** 메뉴판과 같은 푸터 */
  footer: StoreFooterProps;
  /** 크기 기준 (가격 기준을 넣은 단계만) — 예산을 정하면 그에 맞는 크기를 알려준다 */
  sizeTiers: SizeTier[];
}

type Option = {
  // 손님 말투로 — 누르면 그대로 손님 말풍선이 된다
  text: string;
  // 가게가 이어서 하는 말
  reply: string;
  // 답한 뒤 넘어갈 곳
  href?: string;
  // 이동 없이 이 대화창에서 질문을 이어가는 주문 (사장님 스타일 / 찾아본 사진)
  flow?: StyleKind;
};

type Question = {
  key: string;
  // 요약 카드에 쓰는 이름
  label: string;
  ask: string;
  options?: string[];
  // 버튼에 짧게 보일 이름 (저장 값은 options 그대로)
  short?: Record<string, string>;
  // 건너뛸 수 있는 질문 (맞춤주문 1단계처럼 선택)
  skippable?: boolean;
  // 예산 — 버튼으로 금액을 쌓아 정확히 정한다
  budget?: boolean;
};

const SKIP = "넘어갈게요";

// 상품 없이 하는 주문 — 맞춤주문 1·2단계(선물 정보 → 취향·예산)를 대화로 묻는다
const GIFT_QUESTIONS: Question[] = [
  { key: "purpose", label: "선물 목적", ask: "어떤 날 드릴 꽃이에요?", options: ["기념", "축하", "감사", "위로", "데이트", "기타"], skippable: true },
  { key: "gender", label: "받는 분", ask: "받는 분은 어떤 분이세요?", options: ["여성", "남성"], skippable: true },
  { key: "age", label: "연령대", ask: "연령대도 알려주시겠어요?", options: ["10대 이하", "10대", "20대", "30대", "40대", "50대 이상"], short: { "10대 이하": "10대↓", "50대 이상": "50대↑" }, skippable: true },
];
const TYPE_OPTIONS = ["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "기타"];
const BUDGET_Q: Question = { key: "budget", label: "예산", ask: "얼마에 맞춰서 제작해드릴까요?", budget: true };

const QUESTIONS: Record<StyleKind, Question[]> = {
  // 사장님 스타일 — 분위기도 맡길 수 있게 '사장님에게 맡길게요'를 맨 앞에
  style: [
    ...GIFT_QUESTIONS,
    { key: "type", label: "상품 형태", ask: "어떤 형태로 만들어드릴까요?", options: TYPE_OPTIONS },
    { key: "mood", label: "분위기", ask: "원하시는 분위기가 있을까요?", options: STYLE_MOODS },
    BUDGET_Q,
  ],
  // 찾아본 사진 — 분위기는 보낸 사진 분위기로 정해져 묻지 않는다. 형태는 준비 기간·수령에 영향을 줘서 손님에게 사진 속 형태를 묻는다
  photo: [
    ...GIFT_QUESTIONS,
    { key: "type", label: "상품 형태", ask: "사진 속 꽃은 어떤 형태인가요?", options: TYPE_OPTIONS },
    BUDGET_Q,
  ],
};
// 요약 카드에서 분위기를 맡긴 답은 짧게
const SUMMARY_MOOD: Record<string, string> = { [STYLE_MOOD_TRUST]: "사장님 스타일", [PHOTO_MOOD_SAME]: "보낸 사진 분위기" };

// 보낼 사진을 줄여 data URL로 — 긴 변 1600px JPEG(화질 85%). 휴대폰 원본은 너무 커서 줄인다
// 주문을 마칠 때까지 이 탭에만 보관하므로(저장소에 올리지 않음) 보관이 안 될 만큼 크면 1200px로 한 번 더 줄인다
async function shrinkToDataUrl(file: File, maxSide = 1600, quality = 0.85): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}

// 예산 버튼 — 눌러서 금액을 더한다 (직접 입력 없이 클릭만으로)
const BUDGET_STEPS = [10000, 50000, 100000];
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 답 버튼 한 줄 — 넘치면 줄바꿈 대신 옆으로 밀어 본다 (넘칠 때만 오른쪽 끝을 흐리게 해 더 있다는 걸 알린다)
function ChipRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setOverflow(el.scrollWidth > el.clientWidth + 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="no-scrollbar -mx-4 md:-mx-5 px-4 md:px-5 overflow-x-auto"
      style={overflow && !atEnd ? { maskImage: "linear-gradient(to right, #000 calc(100% - 40px), transparent)", WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 40px), transparent)" } : undefined}
    >
      {/* 다 들어가면 오른쪽(손님 쪽)에 붙고, 넘치면 왼쪽부터 시작해 밀어서 본다 */}
      <div className="flex gap-2 w-max ml-auto">{children}</div>
    </div>
  );
}

// 화면에 그릴 말 한 줄
type Item =
  | { id: string; from: "shop"; text: string }
  | { id: string; from: "shop"; photos: string[] }
  | { id: string; from: "shop"; summary: { label: string; value: string }[]; image?: string }
  | { id: string; from: "shop"; size: SizeTier; price: number }
  | { id: string; from: "me"; text: string; onEdit?: () => void }
  | { id: string; from: "me"; image: string };

// 매장 첫 화면 — 꽃집과 메시지 나누듯 "어떤 방식으로 주문할지"부터 고른다.
// 추천은 맞춤주문, 직접 고르기·사진 주문은 메뉴판으로 넘어가고, '사장님 스타일'은 이 대화창에서 질문을 이어간다
export default function StoreWelcomeClient({ slug, companyName, logoImage, themeVars, consultEnabled, photos, footer, sizeTiers }: Props) {
  const router = useRouter();

  const menuHref = `/${slug}/menu`;
  const options: Option[] = [
    // 맞춤주문을 꺼 둔 매장은 사장님 스타일·추천·사진 주문을 받지 않는다 (모두 맞춤주문 결제 화면으로 이어진다)
    ...(consultEnabled
      ? [
          {
            text: "사장님 스타일로 알아서 부탁드려요",
            reply: "네! 가장 예쁜 꽃들로\n신경 써서 제작해드릴게요 💐\n몇 가지만 여쭤볼게요.",
            flow: "style" as const,
          },
          { text: "잘 모르겠어요, 추천해주세요", reply: "네, 좋아요! 몇 가지만 여쭤보고\n딱 맞는 꽃으로 추천해드릴게요 💐", href: `/${slug}/consult` },
          {
            text: "찾아본 사진이랑 비슷하게 하고 싶어요",
            reply: "좋아요! 보내주신 사진의 분위기와\n비슷하게 만들어드릴 수 있어요 📷\n찾아보신 사진을 보내주시겠어요?",
            flow: "photo" as const,
          },
        ]
      : [
          // 맞춤주문을 꺼 둔 매장은 사진 주문도 결제 화면이 없어 메뉴판으로 안내
          {
            text: "찾아본 사진이랑 비슷하게 하고 싶어요",
            reply: "사진으로 주문하는 방법은 곧 열릴 예정이에요!\n메뉴판에서 비슷한 분위기를 먼저 찾아봐 주세요 📷",
            href: menuHref,
          },
        ]),
    { text: "사진 보고 직접 고를게요", reply: "네, 알겠습니다! 메뉴판 보여드릴게요.\n메뉴 보시고 주문해주세요 🌷", href: menuHref },
  ];

  // ── 대화 진행 상태 ──
  // 첫 인사가 몇 줄 나왔는지 (인사 → 사진 → 질문)
  // 첫 인사 순서: 인사 → (매장 작품 사진) → 주문 방식 질문
  const intro: Item[] = [
    { id: "hi", from: "shop", text: `안녕하세요, ${companyName}입니다.` },
    ...(photos.length > 0 ? [{ id: "photos", from: "shop" as const, photos }] : []),
    { id: "how", from: "shop", text: "예약·주문은 어떤 방식으로 하시겠어요?" },
  ];
  const introTotal = intro.length;
  const [introShown, setIntroShown] = useState(0);
  const [choice, setChoice] = useState<Option | null>(null);
  const [replied, setReplied] = useState(false);
  // 사장님 스타일 — 지금까지 물어본 질문 수와 받은 답
  const [asked, setAsked] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [budget, setBudget] = useState(0);
  // 요약 카드는 가게가 '입력 중'을 마친 뒤에 한 번만 나타난다 (답하자마자 떴다 사라지지 않게)
  const [summaryShown, setSummaryShown] = useState(false);
  // 예산에 맞는 크기 안내 — 예산을 정하면 '크기 확인 중...' 뒤에 한 번 나온다
  const [sizeShown, setSizeShown] = useState(false);
  // 입력 중 말풍선에 함께 보일 말 (예: '크기 확인 중')
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  // 요약을 보고 '이대로 주문할게요'를 눌렀는지 — 누른 뒤엔 답을 고칠 수 없다 (곧 결제 화면으로 넘어간다)
  const [confirmed, setConfirmed] = useState(false);
  const [byeShown, setByeShown] = useState(false);
  const [typing, setTyping] = useState(true);
  // 찾아본 사진 — 보낸 사진(줄인 data URL, 이 탭에 보관)과 진행 상태
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refFailed, setRefFailed] = useState(false);
  // 가게가 사진을 받았다고 답했는지 — 입력 중을 마친 뒤에만 보이게 (떴다 사라지지 않게)
  const [refAck, setRefAck] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // 생화 안내 — 사진 주문은 '이대로 주문할게요' 전에 한 번 보여준다
  const [showFlowerNotice, setShowFlowerNotice] = useState(false);
  const flow: StyleKind = choice?.flow ?? "style";
  const QS = QUESTIONS[flow];

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearLater = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // 가게가 잠깐 입력하다 말을 보낸다
  const shopSays = (fn: () => void, wait = 650, label: string | null = null) => {
    setTyping(true);
    setTypingLabel(label);
    later(wait, () => {
      setTyping(false);
      setTypingLabel(null);
      fn();
    });
  };

  useEffect(() => {
    // 한 줄씩 이어서 — 첫 말은 0.45초 뒤, 그다음부터 0.6초 간격
    for (let i = 1; i <= introTotal; i++) {
      later(450 + (i - 1) * 600, () => {
        setIntroShown(i);
        if (i === introTotal) setTyping(false);
      });
    }
    // 넘어갈 화면을 미리 받아 둔다
    router.prefetch(menuHref);
    if (consultEnabled) router.prefetch(`/${slug}/consult`);
    return clearLater;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (o: Option) => {
    setChoice(o);
    later(250, () =>
      shopSays(() => {
        setReplied(true);
        // 답을 읽을 틈을 두고 넘어간다
        if (o.href) later(1400, () => router.push(o.href!));
        // 사장님 스타일 — 첫 질문을 이어서 (찾아본 사진은 사진을 받은 뒤에)
        else if (o.flow === "style") later(500, () => shopSays(() => setAsked(1)));
      }, 750)
    );
  };

  // 찾아본 사진 보내기 — 먼저 손님 말풍선으로 보여 주고, 올라가면 가게가 받아서 질문을 이어간다
  const sendPhoto = async (file: File) => {
    setRefFailed(false);
    setRefAck(false);
    // 저장소에 올리지 않고 이 탭에 보관만 한다 — 결제가 승인되면 그때 서버가 올린다
    let data = await shrinkToDataUrl(file);
    const keep = (d: string) => {
      try {
        sessionStorage.setItem(photoOrderKey(slug), d);
        return true;
      } catch {
        return false;
      }
    };
    if (data && !keep(data)) {
      data = await shrinkToDataUrl(file, 1200, 0.8);
      if (data && !keep(data)) data = null;
    }
    if (!data) {
      later(200, () => shopSays(() => setRefFailed(true), 600));
      return;
    }
    setRefPreview(data);
    later(250, () =>
      shopSays(() => {
        setRefAck(true);
        later(400, () => shopSays(() => setAsked(1)));
      }, 750)
    );
  };

  // 지금 질문에 답한다 → 다음 질문 (마지막이면 요약)
  const answer = (v: string) => {
    const next = [...answers.slice(0, asked - 1), v];
    setAnswers(next);
    if (asked < QS.length) later(200, () => shopSays(() => setAsked(asked + 1), 550));
    // 예산(마지막 질문)을 정하면 — 크기 기준이 있으면 '크기 확인 중...' → 크기 안내 → 요약
    else if (QS[asked - 1].budget && sizeForPrice(sizeTiers, Number(v.replace(/\D/g, "")))) {
      later(200, () =>
        shopSays(() => {
          setSizeShown(true);
          later(500, () => shopSays(() => setSummaryShown(true), 700));
        }, 1200, "크기 확인 중")
      );
    } else later(200, () => shopSays(() => setSummaryShown(true), 700));
  };

  // 요약대로 주문 — 받은 답을 맞춤주문 마지막 단계(예약 확인·결제)로 넘긴다
  const CONFIRM_TEXT = "이대로 주문할게요";
  const confirm = () => {
    setShowFlowerNotice(false);
    setConfirmed(true);
    // 질문 순서가 주문마다 달라 key로 답을 찾는다
    const a = (key: string) => {
      const v = answers[QS.findIndex((q) => q.key === key)];
      return v === SKIP ? "" : v ?? "";
    };
    const href = styleOrderHref(slug, {
      kind: flow,
      purpose: a("purpose"),
      gender: a("gender"),
      age: a("age"),
      productType: a("type"),
      // 찾아본 사진은 분위기를 묻지 않고 '보낸 사진 분위기'로 고정
      mood: flow === "photo" ? PHOTO_MOOD_SAME : a("mood"),
      budget: Number(a("budget").replace(/\D/g, "")),
    });
    router.prefetch(href);
    later(250, () =>
      shopSays(() => {
        setByeShown(true);
        // 답을 읽을 틈을 두고 넘어간다
        later(1400, () => router.push(href));
      }, 750)
    );
  };

  // 이미 보낸 답을 눌러 그 질문부터 다시 고른다
  const editFrom = (qIdx: number) => {
    clearLater();
    setTyping(false);
    setAnswers((a) => a.slice(0, qIdx));
    setAsked(qIdx + 1);
    setSummaryShown(false);
    setSizeShown(false);
    setTypingLabel(null);
    if (QS[qIdx].budget) {
      const prev = answers[qIdx];
      setBudget(prev ? Number(prev.replace(/\D/g, "")) : 0);
    }
  };

  // ── 화면에 그릴 대화 ──
  const items: Item[] = [];
  items.push(...intro.slice(0, introShown));
  if (choice) items.push({ id: "choice", from: "me", text: choice.text });
  if (choice && replied) items.push({ id: "reply", from: "shop", text: choice.reply });
  // 찾아본 사진 — 보낸 사진, 가게 답 (못 보냈으면 다시 부탁)
  if (refPreview) items.push({ id: "ref", from: "me", image: refPreview });
  if (refFailed) items.push({ id: "ref-fail", from: "shop", text: "사진을 불러오지 못했어요 😢\n다른 사진으로 다시 보내주시겠어요?" });
  if (refAck)
    items.push({ id: "ref-ok", from: "shop", text: "예쁜 사진이네요! 이 느낌으로 준비해볼게요.\n몇 가지만 더 여쭤볼게요." });
  for (let i = 0; i < asked; i++) {
    const q = QS[i];
    items.push({ id: `q${i}`, from: "shop", text: q.ask });
    if (answers[i] !== undefined) items.push({ id: `a${i}`, from: "me", text: q.budget ? `${answers[i]}에 맞춰주세요` : (q.short?.[answers[i]] ?? answers[i]), onEdit: confirmed ? undefined : () => editFrom(i) });
  }
  // 예산에 맞는 크기
  const budgetIdx = QS.findIndex((q) => q.budget);
  const budgetValue = budgetIdx >= 0 && answers[budgetIdx] ? Number(answers[budgetIdx].replace(/\D/g, "")) : 0;
  const size = budgetValue ? sizeForPrice(sizeTiers, budgetValue) : null;
  if (sizeShown && size) items.push({ id: "size", from: "shop", size, price: budgetValue });
  if (summaryShown) {
    items.push({
      id: "summary",
      from: "shop",
      // 분위기를 맡겼으면 요약에는 짧게 ('사장님 스타일' / '보낸 사진 분위기')
      summary: [
        ...QS.map((q, i) => ({
          label: q.label,
          value: answers[i] === SKIP ? "-" : SUMMARY_MOOD[answers[i]] ?? answers[i],
        })),
        // 찾아본 사진 — 묻지 않은 분위기도 요약에는 보여 준다 (예산 앞에)
      ]
        .flatMap((r) => (flow === "photo" && r.label === "예산" ? [{ label: "분위기", value: SUMMARY_MOOD[PHOTO_MOOD_SAME] }, r] : [r]))
        // 예산에 맞는 크기도 예산 다음 줄에
        .flatMap((r) => (r.label === "예산" && size ? [r, { label: "크기", value: size.name }] : [r])),
      image: flow === "photo" ? refPreview ?? undefined : undefined,
    });
  }
  if (confirmed) items.push({ id: "confirm", from: "me", text: CONFIRM_TEXT });
  if (byeShown) items.push({ id: "bye", from: "shop", text: "네! 이제 받으실 날짜와 정보만 알려주세요 🌷" });

  // 지금 답을 기다리는 질문
  const current = !typing && asked > 0 && answers.length < asked ? QS[asked - 1] : null;
  // 사진을 기다리는 중 (가게가 부탁한 뒤 · 아직 못 받았을 때)
  const waitingPhoto = flow === "photo" && replied && !typing && !refPreview;
  const showLanding = !typing && introShown >= introTotal && !choice;

  // 새 말이 붙으면 맨 아래가 보이게 (손님이 고르기 시작한 뒤부터)
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 대화 끝(지금 고를 답)이 화면 맨 아래가 아니라 위에서 2/3 지점에 오게 — 손가락이 닿기 쉬운 높이에 머문다
    const el = endRef.current;
    if (!choice || !el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * (2 / 3);
    if (top > 0) window.scrollTo({ top, behavior: "smooth" });
  }, [items.length, typing, current, choice]);

  // 가게 프로필 — 로고가 있으면 로고, 없으면 가게 이름 첫 글자
  const avatar = (
    <span className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-beige-200 overflow-hidden flex items-center justify-center">
      {logoImage ? (
        <Image src={logoImage} alt="" width={44} height={44} className="w-full h-full object-contain p-1" />
      ) : (
        <span className="text-gold-600 font-semibold text-base">{companyName.slice(0, 1)}</span>
      )}
    </span>
  );
  const avatarGap = <span className="shrink-0 w-10 md:w-11" />;

  // 가게 말이 연달아 오면 프로필·이름은 첫 말풍선에만
  const isFirstOfRun = (i: number) => items[i].from === "shop" && (i === 0 || items[i - 1].from !== "shop");
  const lastIsShop = items.length > 0 && items[items.length - 1].from === "shop";

  const bubbleText = "text-[16px] md:text-[17px] leading-relaxed";
  // 손님 답장 후보 (오른쪽, 테두리만)
  const replyBtn = `welcome-in break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-white border border-gold-400 text-gold-600 font-medium ${bubbleText} hover:bg-gold-500 hover:border-gold-500 hover:text-white active:scale-[0.97] transition-colors`;

  return (
    <div className="min-h-dvh flex flex-col bg-beige-100" style={themeVars as React.CSSProperties}>
      <style>{`
        @keyframes welcome-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .welcome-in { animation: welcome-in .28s ease-out both; }
        @keyframes welcome-dot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
        .welcome-dot { animation: welcome-dot 1.2s infinite; }
      `}</style>

      {/* 상단 로고 */}
      <header className="h-16 md:h-24 flex items-center justify-center bg-white border-b border-gray-100 shrink-0">
        {logoImage ? (
          <Image src={logoImage} alt={companyName} width={240} height={48} className="object-contain h-12 w-auto md:h-14" priority />
        ) : (
          <span className="font-light tracking-widest text-gold-500 text-2xl md:text-3xl">{companyName}</span>
        )}
      </header>

      {/* 대화 */}
      <main className={`flex-1 w-full max-w-lg mx-auto px-4 md:px-5 pt-8 md:pt-14 ${choice ? "pb-[36dvh]" : "pb-16"}`}>
        <div className="flex flex-col gap-1.5">
          {items.map((m, i) =>
            m.from === "shop" ? (
              <div key={m.id} className={`welcome-in flex items-start gap-2.5 ${isFirstOfRun(i) && i > 0 ? "mt-4" : ""}`}>
                {isFirstOfRun(i) ? avatar : avatarGap}
                <div className="min-w-0 flex-1">
                  {isFirstOfRun(i) && <p className="text-[13px] text-gray-500 mb-1">{companyName}</p>}
                  {"photos" in m ? (
                    // 매장 작품 사진 — 메시지로 사진을 보내온 것처럼
                    <div className="flex gap-1 w-full max-w-[300px] rounded-2xl overflow-hidden">
                      {m.photos.map((src) => (
                        <div key={src} className="relative flex-1 aspect-[4/5] bg-beige-200">
                          <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : "size" in m ? (
                    // 예산에 맞는 크기 — (?)를 누르면 사장님이 넣어 둔 크기 참고 사진
                    <div className={`inline-flex items-center gap-1.5 flex-wrap break-keep px-4 py-2.5 rounded-2xl rounded-tl-md bg-white text-gray-800 ${bubbleText}`}>
                      <span>
                        {won(m.price)}이면 크기는 <b className="font-semibold text-gold-600">{m.size.name}</b>이에요.
                      </span>
                      <SizeGuideButton name={m.size.name} image={m.size.image} />
                    </div>
                  ) : "summary" in m ? (
                    // 받은 답 정리 — 사장님이 주문 내용을 받아 적은 메모처럼
                    <div className="w-full max-w-[300px] rounded-2xl rounded-tl-md bg-white px-4 py-3.5">
                      <p className={`font-semibold text-gray-900 mb-2 ${bubbleText}`}>이렇게 준비해드릴게요!</p>
                      {m.image && (
                        // 찾아본 사진 주문 — 보낸 사진을 함께
                        // eslint-disable-next-line @next/next/no-img-element -- 방금 고른 사진(data URL)
                        <img src={m.image} alt="보낸 사진" className="w-16 h-16 rounded-lg object-cover mb-2.5" />
                      )}
                      <dl className="space-y-1.5">
                        {m.summary.map((r) => (
                          <div key={r.label} className="flex justify-between gap-3 text-[15px]">
                            <dt className="text-gray-500 shrink-0">{r.label}</dt>
                            <dd className="text-gray-900 font-medium text-right break-keep">{r.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : (
                    <p className={`inline-block whitespace-pre-line break-keep px-4 py-2.5 rounded-2xl rounded-tl-md bg-white text-gray-800 ${bubbleText}`}>
                      {m.text}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div key={m.id} className="welcome-in flex justify-end mt-4">
                {"image" in m ? (
                  // 손님이 보낸 사진
                  <div className="w-[200px] md:w-[240px] rounded-2xl rounded-br-md overflow-hidden bg-beige-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 방금 고른 사진(data URL)이라 next/image가 필요 없다 */}
                    <img src={m.image} alt="보낸 사진" className="block w-full h-auto" />
                  </div>
                ) : m.onEdit ? (
                  // 보낸 답을 누르면 그 질문부터 다시 고를 수 있다
                  <button
                    type="button"
                    onClick={m.onEdit}
                    title="다시 고르기"
                    className={`max-w-[85%] text-right break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-gold-500 text-white hover:bg-gold-600 transition-colors ${bubbleText}`}
                  >
                    {m.text}
                  </button>
                ) : (
                  <p className={`max-w-[85%] break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-gold-500 text-white ${bubbleText}`}>{m.text}</p>
                )}
              </div>
            )
          )}

          {/* 가게가 입력 중 */}
          {typing && (
            <div className={`welcome-in flex items-start gap-2.5 ${lastIsShop ? "" : "mt-4"}`}>
              {lastIsShop ? avatarGap : avatar}
              <span className="inline-flex items-center gap-1 px-4 py-4 rounded-2xl rounded-tl-md bg-white">
                {/* 무엇을 하는 중인지 함께 (예: 크기 확인 중) */}
                {typingLabel && <span className={`text-gray-500 mr-1 -my-1 ${bubbleText}`}>{typingLabel}</span>}
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} className="welcome-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
            </div>
          )}

          {/* 첫 질문 — 주문 방식 고르기 */}
          {showLanding && (
            <div className="flex flex-col items-end gap-2 mt-6">
              {options.map((o, i) => (
                <button key={o.text} type="button" onClick={() => pick(o)} className={`max-w-[85%] text-right ${replyBtn}`} style={{ animationDelay: `${i * 0.07}s` }}>
                  {o.text}
                </button>
              ))}
            </div>
          )}

          {/* 사장님 스타일 — 지금 질문의 답 고르기 */}
          {current && !current.budget && (
            <div className="flex flex-col items-end gap-2 mt-5">
              {/* 고를 답은 한 줄로 — 많으면 옆으로 밀어서 본다 */}
              <div className="self-stretch">
                <ChipRow>
                  {current.options!.map((v, i) => (
                    <button key={v} type="button" onClick={() => answer(v)} className={`shrink-0 whitespace-nowrap ${replyBtn}`} style={{ animationDelay: `${i * 0.04}s` }}>
                      {current.short?.[v] ?? v}
                    </button>
                  ))}
                </ChipRow>
              </div>
              {/* 건너뛰기는 답과 섞이지 않게 아래 줄에 따로 */}
              {current.skippable && (
                <button type="button" onClick={() => answer(SKIP)} className="welcome-in px-2 py-1 text-[15px] text-gray-400 hover:text-gray-600">
                  {SKIP}
                </button>
              )}
            </div>
          )}

          {/* 예산 — 금액 버튼을 눌러 쌓는다 */}
          {current?.budget && (
            <div className="welcome-in self-end w-full max-w-[320px] mt-5 rounded-2xl rounded-br-md bg-white border border-gold-400 p-4">
              {/* 금액은 오른쪽 끝에, 되돌리기 아이콘은 왼쪽에 */}
              <div className="flex items-center justify-between gap-3 mb-3">
                {budget > 0 ? (
                  // 0원으로 되돌리기 — 새로고침 모양 아이콘
                  <button
                    type="button"
                    onClick={() => setBudget(0)}
                    aria-label="금액 다시 정하기"
                    title="다시"
                    className="-ml-1.5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-beige-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                ) : (
                  <span />
                )}
                <span className="text-[28px] font-semibold text-gray-900 tabular-nums">{won(budget)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {BUDGET_STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBudget((b) => b + s)}
                    className="py-2.5 rounded-xl bg-beige-100 text-gold-600 font-semibold text-[15px] hover:bg-gold-500 hover:text-white active:scale-[0.96] transition-colors"
                  >
                    +{s / 10000}만
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={budget === 0}
                onClick={() => answer(won(budget))}
                className="mt-3 w-full py-3 rounded-xl bg-gold-500 text-white font-medium text-[15px] hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {budget > 0 ? `${won(budget)}으로 부탁드려요` : "금액을 눌러 정해주세요"}
              </button>
            </div>
          )}
          {/* 찾아본 사진 보내기 — 앨범에서 고른다 */}
          {waitingPhoto && (
            <div className="flex justify-end mt-5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) sendPhoto(f);
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className={`inline-flex items-center gap-2 ${replyBtn}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                사진 보내기
              </button>
            </div>
          )}

          {/* 요약을 보고 주문으로 넘어가기 — 사진 주문은 생화 안내를 먼저 */}
          {summaryShown && !confirmed && !typing && (
            <div className="flex flex-col items-end gap-2 mt-5">
              <button type="button" onClick={flow === "photo" ? () => setShowFlowerNotice(true) : confirm} className={replyBtn}>
                {CONFIRM_TEXT}
              </button>
              <p className="welcome-in text-[13px] text-gray-400">보낸 답을 누르면 다시 고를 수 있어요</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {/* 푸터 — 메뉴판과 같은 바로가기 버튼·정책 링크·사업자 정보 */}
      <StoreFooter {...footer} />

      {/* 생화 안내 — 사진과 똑같이는 어렵다는 것 (맞춤주문 상품 선택 뒤와 같은 안내) */}
      {showFlowerNotice && <FlowerNoticeModal onConfirm={confirm} onClose={() => setShowFlowerNotice(false)} />}
    </div>
  );
}
