import Link from "next/link";

// 아직 만들지 않은 미리보기 화면 자리
export default function PreviewComingSoon({ title }: { title: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ background: "#18130e" }}>
      <p className="text-[11px] tracking-[0.25em] uppercase font-medium mb-3" style={{ color: "#c9a96e" }}>Coming soon</p>
      <h1 className="text-white text-2xl font-semibold mb-2">{title} 미리보기</h1>
      <p className="text-[14px] mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>지금 준비하고 있어요.</p>
      <Link
        href="/preview"
        className="text-[13px] px-5 py-2.5 rounded-full font-medium"
        style={{ color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.25)" }}
      >
        ← 미리보기 처음으로
      </Link>
    </div>
  );
}
