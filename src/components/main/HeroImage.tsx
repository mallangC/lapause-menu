// import Image from "next/image";

export default function HeroImage() {
  return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative w-full max-w-2xl aspect-4/3 rounded-2xl overflow-hidden shadow-lg bg-beige-200">
          {/*<Image*/}
          {/*    src="/hero.png"*/}
          {/*    alt="Lapause Fleur"*/}
          {/*    fill*/}
          {/*    className="object-cover z-0"*/}
          {/*    priority*/}
          {/*/>*/}

          {/* 텍스트 레이어: bg-beige-200를 빼거나 배경을 반투명하게 조절 */}
          {/*<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/10">*/}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center ">
            <p className="text-4xl font-light tracking-widest text-gold-500 mb-2 drop-shadow-md">
              Lapause Fleur
            </p>
            <p className="text-sm text-gold-500 tracking-wider drop-shadow-sm">
              필터를 선택하여 메뉴를 확인하세요
            </p>
          </div>
        </div>
      </div>
  );
}