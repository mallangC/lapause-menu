import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/notice" },
};

export default function NoticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
