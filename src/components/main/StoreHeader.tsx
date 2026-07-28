"use client";

import Image from "next/image";
import Link from "next/link";

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
  const logo = logoImage ? (
    <Image src={logoImage} alt={companyName} width={240} height={48} className="object-contain h-12 w-auto" />
  ) : (
    <span className="font-light tracking-widest text-gold-500 text-2xl">{companyName}</span>
  );

  const navLinkClass = "text-sm text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap px-3 py-2";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      {/* 로고 + 맞춤주문 */}
      <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
        <Link href={`/${slug}`}>{logo}</Link>

        {/* PC 네비 */}
        <nav className="hidden md:flex items-center gap-0">
          <Link href={`/${slug}/products`} className={navLinkClass}>전체 상품</Link>
          {productTypeList.map((type) => (
            <Link key={type} href={`/${slug}/products?type=${encodeURIComponent(type)}`} className={navLinkClass}>
              {type}
            </Link>
          ))}
          {seasonList.length > 0 && (
            <>
              <span className="text-gray-200 mx-1">|</span>
              {seasonList.map((season) => (
                <Link key={season} href={`/${slug}/products?tab=season`} className={navLinkClass}>
                  {season}
                </Link>
              ))}
            </>
          )}
          {consultEnabled && (
            <Link
              href={`/${slug}/consult`}
              className="ml-3 px-4 py-1.5 rounded-full bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
            >
              맞춤주문
            </Link>
          )}
        </nav>

        {/* 모바일 맞춤주문 버튼 */}
        {consultEnabled && (
          <Link
            href={`/${slug}/consult`}
            className="md:hidden px-3.5 py-1.5 rounded-full bg-gold-500 text-white text-xs font-medium whitespace-nowrap"
          >
            맞춤주문
          </Link>
        )}
      </div>

      {/* 모바일 가로 스크롤 네비 바 */}
      <nav className="md:hidden flex overflow-x-auto no-scrollbar border-t border-gray-100 px-4 gap-1">
        <Link href={`/${slug}/products`} className="shrink-0 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">
          전체 상품
        </Link>
        {productTypeList.map((type) => (
          <Link key={type} href={`/${slug}/products?type=${encodeURIComponent(type)}`} className="shrink-0 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">
            {type}
          </Link>
        ))}
        {seasonList.map((season) => (
          <Link key={season} href={`/${slug}/products?tab=season`} className="shrink-0 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">
            {season}
          </Link>
        ))}
      </nav>
    </header>
  );
}
