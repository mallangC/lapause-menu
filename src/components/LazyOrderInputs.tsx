"use client";

// 주문서 2단계(예약 확인)에서만 쓰는 무거운 입력 도구 — 달력·주소 검색
// 첫 화면(1단계 선물 정보)을 그릴 때 함께 받지 않도록 따로 불러온다.
// 주문서가 열리면 preloadOrderInputs()로 미리 받아 둬서 2단계로 넘어갈 땐 바로 보인다.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const loadDatePicker = () =>
  Promise.all([import("react-datepicker"), import("date-fns/locale/ko")]).then(([m, { ko }]) => {
    m.registerLocale("ko", ko);
    // 라이브러리 defaultProps 타입이 dynamic()과 맞지 않아 props 타입으로 맞춘다
    return m.default as unknown as ComponentType<DatePickerProps>;
  });
const loadPostcode = () => import("react-daum-postcode").then((m) => m.default);

export const LazyDatePicker = dynamic(loadDatePicker, {
  ssr: false,
  // 달력 자리 높이를 잡아 둬서 불러온 뒤 화면이 튀지 않게 한다
  loading: () => <div className="h-[320px] animate-pulse bg-gray-50" />,
});

export const LazyDaumPostcode = dynamic(loadPostcode, {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse bg-gray-50" />,
});

export function preloadOrderInputs() {
  loadDatePicker().catch(() => {});
  loadPostcode().catch(() => {});
}
