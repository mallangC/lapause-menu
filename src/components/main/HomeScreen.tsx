import Image from "next/image";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";

const POLICY_LINKS = [
  { label: "이용 안내", href: "/guide" },
  { label: "환불 정책", href: "/refund" },
  { label: "이용약관", href: "/terms" },
];

interface HomeScreenProps {
  slug?: string;
  homeFeaturedImage?: string | null;
  homeAllImage?: string | null;
  homeSeasonImage?: string | null;
  homeConsultImage?: string | null;
  locationUrl?: string | null;
  kakaoChannelUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  consultEnabled?: boolean;
  onSelectFeatured: () => void;
  onSelectAll: () => void;
  onSelectSeason: () => void;
}

export default function HomeScreen({
  slug,
  homeFeaturedImage,
  homeAllImage,
  homeSeasonImage,
  homeConsultImage,
  locationUrl,
  kakaoChannelUrl,
  instagramUrl,
  youtubeUrl,
  consultEnabled = false,
  onSelectFeatured,
  onSelectAll,
  onSelectSeason,
}: HomeScreenProps) {
  const cards = [
    { label: "추천/인기", image: homeFeaturedImage, onClick: onSelectFeatured },
    { label: "모든 상품", image: homeAllImage, onClick: onSelectAll },
    { label: "시즌", image: homeSeasonImage, onClick: onSelectSeason },
  ];

  const hasChannels = locationUrl || kakaoChannelUrl || instagramUrl || youtubeUrl;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-14 pb-14 flex flex-col items-center gap-16">
      <div className={`grid grid-cols-2 gap-4 w-full md:gap-6 ${consultEnabled ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {cards.map(({ label, image, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`relative flex items-center justify-center overflow-hidden bg-beige-50 rounded-2xl aspect-square md:aspect-auto md:py-35 transition-all shadow-sm group ${
              image ? "border-0" : "border border-gray-200 hover:border-gold-400"
            }`}
          >
            {image && <Image src={image} alt={label} fill className="object-cover" />}
            <div
              className={`absolute inset-0 rounded-2xl transition-opacity ${
                image ? "bg-black/15 group-hover:bg-black/25" : "group-hover:bg-gold-400/5"
              }`}
            />
            <span
              className={`relative text-xl md:text-3xl font-bold transition-colors ${
                image ? "text-white" : "text-foreground group-hover:text-gold-500"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
        {consultEnabled && (
          <Link
            href={`/${slug}/consult`}
            className={`relative flex items-center justify-center overflow-hidden bg-beige-50 rounded-2xl aspect-square md:aspect-auto md:py-35 transition-all shadow-sm group ${
              homeConsultImage ? "border-0" : "border border-gray-200 hover:border-gold-400"
            }`}
          >
            {homeConsultImage && <Image src={homeConsultImage} alt="맞춤 주문하기" fill className="object-cover" />}
            <div
              className={`absolute inset-0 rounded-2xl transition-opacity ${
                homeConsultImage ? "bg-black/15 group-hover:bg-black/25" : "group-hover:bg-gold-400/5"
              }`}
            />
            <span
              className={`relative text-xl md:text-3xl font-bold transition-colors text-center leading-tight px-4 ${
                homeConsultImage ? "text-white" : "text-foreground group-hover:text-gold-500"
              }`}
            >
              맞춤<br />주문하기
            </span>
          </Link>
        )}
      </div>

      {hasChannels && (
        <div className="flex flex-row gap-8 justify-center">
          {locationUrl && (
            <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80"
                style={{ backgroundColor: "#56C0E0" }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">매장 위치</span>
            </a>
          )}
          {kakaoChannelUrl && (
            <a href={kakaoChannelUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80"
                style={{ backgroundColor: "#FEE500" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">카카오 채널</span>
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">인스타그램</span>
            </a>
          )}
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80"
                style={{ backgroundColor: "#FF0000" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">유튜브</span>
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
          {POLICY_LINKS.map(({ label, href }, i) => (
            <span key={label} className="flex items-center gap-4">
              {i > 0 && <span className="text-gray-200">·</span>}
              <Link href={href} className="hover:text-gray-600 transition-colors">{label}</Link>
            </span>
          ))}
        </div>
        <FloAideFooter />
      </div>
    </div>
  );
}
