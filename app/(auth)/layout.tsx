export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fc] p-5 sm:p-8"><div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"/><div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-200/40 blur-3xl"/>{children}</main>;
}
