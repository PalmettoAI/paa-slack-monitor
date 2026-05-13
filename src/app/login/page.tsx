import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { buildSessionCookie, checkPassword } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    redirect("/login?error=1");
  }
  const c = buildSessionCookie();
  cookies().set(c);
  redirect("/");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  const err = searchParams.error === "1";
  return (
    <main className="min-h-screen grid place-items-center bg-paper px-6">
      <form
        action={login}
        className="w-full max-w-sm rounded-xl border border-ink/10 bg-white p-6 shadow-sm"
      >
        <div className="mb-1 text-xs uppercase tracking-widest text-muted">PAA</div>
        <h1 className="text-xl font-semibold mb-4">Slack Monitor</h1>
        <label className="label">Password</label>
        <input
          type="password"
          name="password"
          autoFocus
          className="input mt-1"
          placeholder="••••••••"
        />
        {err && <p className="mt-3 text-xs text-danger">Incorrect password. Try again.</p>}
        <button type="submit" className="btn-primary mt-5 w-full justify-center">
          Sign in
        </button>
      </form>
    </main>
  );
}
