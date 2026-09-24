import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="auth-page"><a className="brand" href="/">✿ <span>Kaari<span className="brand-accent"> Works</span></span></a><SignIn /></main>;
}
