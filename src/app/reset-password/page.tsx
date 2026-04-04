import ResetPasswordForm from "./ResetPasswordForm";
import Image from "next/image";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <Image src="/logo-light.png" alt="Flo.Aide" width={100} height={36} className="object-contain mx-auto mb-2" />
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-1">새 비밀번호 설정</h1>
          <p className="text-sm text-gray-400">새로운 비밀번호를 입력해주세요</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
