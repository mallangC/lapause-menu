"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";

interface StoreHeaderProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  productTypeList: string[];
  seasonList: string[];
  consultEnabled: boolean;
}

export default function StoreHeader({
  slug,
  companyName,
  logoImage,
  productTypeList,
  seasonList,
  consultEnabled,
}: StoreHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalCount } = useCart(slug);

  const logo = logoImage ? (
    <Image src={logoImage} alt={companyName} width={240} height={48} className="object-contain h-10 w-auto md:h-12" />
  ) : (
    <span className="font-light tracking-widest text-gold-500 text-xl md:text-2xl">{companyName}</span>
  );

  const HamburgerIcon = () => (
    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">

      {/* ── 헤더 행 ── */}
      <div className="px-4 md:px-8 h-14 md:h-20 flex items-center justify-between relative">

        {/* 왼쪽: 햄버거 */}
        <button
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          <HamburgerIcon />
        </button>

        {/* 중앙 로고 */}
        <Link
          href={`/${slug}`}
          className="absolute left-1/2 -translate-x-1/2"
          onClick={() => setMenuOpen(false)}
        >
          {logo}
        </Link>

        {/* 오른쪽: 장바구니 + 맞춤주문 */}
        <div className="flex items-center gap-2">
          <Link href={`/${slug}/cart`} className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gold-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            )}
          </Link>
          {consultEnabled ? (
            <Link
              href={`/${slug}/consult`}
              className="px-4 py-1.5 rounded-full bg-gold-500 text-white text-xs md:text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
            >
              맞춤주문
            </Link>
          ) : (
            <div className="w-2" />
          )}
        </div>
      </div>

      {/* ── 사이드 드로어 딤 ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* ── 사이드 드로어 패널 ── */}
      <div
        className={`fixed top-0 left-0 h-full w-full md:w-80 bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-5 h-14 md:h-20 border-b border-gray-100 shrink-0">
          <Link href={`/${slug}`} onClick={() => setMenuOpen(false)}>
            {logo}
          </Link>
          <button onClick={() => setMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메뉴 항목 */}
        <nav className="flex flex-col px-3 py-4 gap-1 overflow-y-auto">
          <Link
            href={`/${slug}`}
            className="px-4 py-3.5 text-lg md:text-xl font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            전체 상품
          </Link>
          {productTypeList.map((type) => (
            <Link
              key={type}
              href={`/${slug}?type=${encodeURIComponent(type)}`}
              className="px-4 py-3.5 text-lg md:text-xl font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {type}
            </Link>
          ))}
          {seasonList.length > 0 && (
            <>
              <div className="mx-2 my-2 border-t border-gray-100" />
              {seasonList.map((season) => (
                <Link
                  key={season}
                  href={`/${slug}?tab=season`}
                  className="px-4 py-3.5 text-lg md:text-xl font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {season}
                </Link>
              ))}
            </>
          )}
          {consultEnabled && (
            <>
              <div className="mx-2 my-2 border-t border-gray-100" />
              <Link
                href={`/${slug}/consult`}
                className="px-4 py-3.5 text-lg md:text-xl font-medium text-gold-500 hover:bg-gold-50 rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                맞춤주문
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
