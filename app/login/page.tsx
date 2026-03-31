import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/dashboard";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 lg:px-10">
      <div className="absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] size-[480px] rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-12%] size-[460px] rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,1))]" />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1400px] items-center">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
