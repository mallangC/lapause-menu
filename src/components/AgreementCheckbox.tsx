"use client";

// 네이티브 체크박스는 체크 표시 색을 CSS로 강제할 수 없어서, 흰색 체크 아이콘을 직접 그리는 커스텀 체크박스.
// 접근성/폼 동작을 위해 실제 <input type="checkbox">는 그대로 두고 화면에서만 숨긴다.
export default function AgreementCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="relative mt-0.5 w-4 h-4 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 w-4 h-4 opacity-0 cursor-pointer"
      />
      <span
        className={`pointer-events-none flex items-center justify-center w-4 h-4 rounded border transition-colors ${
          checked ? "bg-gold-500 border-gold-500" : "bg-white border-gray-300"
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>
    </span>
  );
}
