import LoginForm from "./LoginForm";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-widest text-gold-500 mb-1">
            Lapause Fleur
          </h1>
          <p className="text-sm text-beige-400">관리자 로그인</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
