import Link from "next/link";

export default function SignupPage() {
  return <section className="panel w-full max-w-md p-7"><h1 className="text-xl font-bold">Request an account</h1><p className="my-5 text-sm text-slate-600">Only the system administrator can create user accounts. Contact your administrator to request access.</p><Link href="/login" className="btn-primary">Back to login</Link></section>;
}
