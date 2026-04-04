import Link from "next/link";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-white rounded-full border border-beige-200 flex items-center justify-center mx-auto mb-6 text-2xl">
          ✉️
        </div>

        <h1 className="text-xl font-medium text-gray-900 mb-2">메일함을 확인해주세요</h1>

        {email && (
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-medium text-gray-700">{email}</span>으로
          </p>
        )}
        <p className="text-sm text-gray-500 mb-8">
          인증 링크를 보냈습니다. 링크를 클릭하면 가입이 완료됩니다.
        </p>

        <div className="bg-white rounded-2xl border border-beige-200 p-5 text-left space-y-2 mb-8">
          <p className="text-xs font-semibold text-gray-500">메일이 오지 않나요?</p>
          <ul className="text-xs text-gray-400 space-y-1 leading-relaxed">
            <li>· 스팸 또는 프로모션 폴더를 확인해보세요</li>
            <li>· 메일이 도착하는 데 최대 1~2분이 걸릴 수 있어요</li>
            <li>· 입력한 이메일 주소가 맞는지 확인해보세요</li>
          </ul>
        </div>

        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          로그인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
