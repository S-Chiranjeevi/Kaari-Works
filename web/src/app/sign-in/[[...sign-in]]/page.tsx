import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-page auth-page--light">
      <div className="auth-brand">
        <span className="auth-brand-mark">✿</span>
        <span className="auth-brand-name">Kaari<span className="brand-accent">Works</span></span>
      </div>
      <p className="auth-welcome">Welcome to Kaari Works</p>
      <SignIn
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
