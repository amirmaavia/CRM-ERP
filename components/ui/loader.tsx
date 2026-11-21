type LoaderProps = {
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Loader({ label = "Loading", size = "sm", className = "" }: LoaderProps) {
  const dimensions = size === "sm" ? "h-4 w-4 border-2" : "h-7 w-7 border-[3px]";
  return <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
    <span className={`${dimensions} animate-spin rounded-full border-current border-r-transparent`} aria-hidden="true" />
    {label && <span>{label}</span>}
  </span>;
}

export function PageLoader({ label = "Loading page…" }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500"><Loader label={label} size="md" /></div>;
}

