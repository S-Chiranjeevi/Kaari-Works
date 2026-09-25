import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-page auth-page--light">
      <div className="auth-brand">
        <span className="auth-brand-mark">✿</span>
        <span className="auth-brand-name">Kaari<span className="brand-accent">Works</span></span>
      </div>
      <p className="auth-welcome">Create your account</p>
      <SignUp
        appearance={{
          elements: {
            headerTitle: { display: "none" },
            headerSubtitle: { display: "none" },
          },
        }}
      />
    </main>
  );
}
