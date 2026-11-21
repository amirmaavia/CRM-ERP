"use client";

import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Dashboard error", error); }, [error]);
  return <section className="panel max-w-2xl p-6"><h1 className="text-xl font-bold">This page could not be loaded</h1><p className="mt-2 text-sm text-slate-600">Retry the request. If it fails again, note what you were doing and contact your administrator.</p>{error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}<button className="btn-primary mt-4" onClick={reset}>Try again</button></section>;
}

