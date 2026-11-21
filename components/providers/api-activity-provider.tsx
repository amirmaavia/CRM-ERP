"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { v2Fetch } from "@/lib/http/v2-fetch";

export function ApiActivityProvider({ children }: { children: React.ReactNode }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const [visible, setVisible] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const originalFetch = window.fetch;
    const trackedFetch: typeof window.fetch = async (...args) => {
      if (mounted.current) setActiveRequests((count) => count + 1);
      try {
        const url = new URL(args[0] instanceof Request ? args[0].url : String(args[0]), window.location.origin);
        if (process.env.NEXT_PUBLIC_API_VERSION === "v2" && url.origin === window.location.origin && url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/v2")) {
          return await v2Fetch(args[0], args[1], originalFetch);
        }
        return await originalFetch(...args);
      } finally {
        if (mounted.current) setActiveRequests((count) => Math.max(0, count - 1));
      }
    };
    window.fetch = trackedFetch;
    return () => {
      mounted.current = false;
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (activeRequests === 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [activeRequests]);

  return <>{children}{visible && <div className="fixed right-4 top-4 z-[100] rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow-lg print:hidden"><Loader label="Please wait…" /></div>}</>;
}
