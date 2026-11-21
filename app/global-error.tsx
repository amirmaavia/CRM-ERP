"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html><body><main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Something went wrong</h1><p className="mt-3 text-slate-600">Your data has not been deleted. Retry the page; if the problem continues, contact your administrator.</p><button className="btn-primary mt-5" onClick={reset}>Try again</button></main></body></html>;
}

