"use client";

import Link from "next/link";

interface MainNavProps {
  slug?: string;
  activeTab?: "all" | "featured" | "season";
  consultEnabled?: boolean;
}

export default function MainNav({ slug, activeTab, consultEnabled = false }: MainNavProps) {
  const tabClass = (active: boolean) =>
    `px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? "border-gold-500 text-gold-500" : "border-transparent text-gray-500 hover:text-gray-800"
    }`;

  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-2 flex justify-center gap-0">
        <Link href={`/${slug}/products`} className={tabClass(activeTab === "all")}>
          전체
        </Link>
        <Link href={`/${slug}/products?tab=featured`} className={tabClass(activeTab === "featured")}>
          추천/인기
        </Link>
        <Link href={`/${slug}/products?tab=season`} className={tabClass(activeTab === "season")}>
          시즌
        </Link>
        {consultEnabled && slug && (
          <Link href={`/${slug}/consult`} className={tabClass(false)}>
            맞춤주문
          </Link>
        )}
      </div>
    </nav>
  );
}
