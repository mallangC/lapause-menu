import SignupForm from "./SignupForm";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <Image src="/logo-light.png" alt="Flo.Aide" width={100} height={36} className="object-contain mx-auto mb-2" />
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-1">회원가입</h1>
          <p className="text-sm text-gray-400">관리자 계정 만들기</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
