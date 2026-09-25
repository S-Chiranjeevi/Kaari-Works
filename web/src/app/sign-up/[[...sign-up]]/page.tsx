import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="auth-brand-mark">✿</span>
        <span className="auth-brand-name">Kaari<span className="brand-accent">Works</span></span>
      </div>
      <SignUp />
    </main>
  );
}
