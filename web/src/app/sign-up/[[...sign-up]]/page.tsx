import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <main className="auth-page"><a className="brand" href="/">✿ <span>Kaari<span className="brand-accent"> Works</span></span></a><SignUp /></main>;
}
