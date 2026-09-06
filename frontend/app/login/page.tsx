import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-widest text-teal-800">
        Phase 1 stub · Harsheel
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        Manufacturer login
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Connect a wallet, sign a message, then pass World ID. Until that is
        wired, use the demo manufacturer seeded in Supabase.
      </p>
      <LoginForm />
    </section>
  );
}
