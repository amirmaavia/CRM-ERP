"use client";
import { useEffect, useState } from "react";
export default function MyActivity() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: { id: string; action: string; entityType: string; description: string; createdAt: string }[]; pagination: { pages: number } }>({ items: [], pagination: { pages: 0 } });
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(`/api/activity?page=${page}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("Could not load activity"); setData(await response.json()); }).catch((error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [page]);
  return <div className="space-y-5"><h1 className="text-2xl font-bold">My Activity</h1>{error && <p role="alert" className="text-red-700">{error}</p>}<div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-4">Time</th><th>Action</th><th>Description</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id} className="border-t"><td className="p-4">{new Date(item.createdAt).toLocaleString()}</td><td>{item.action}</td><td>{item.description}</td></tr>)}</tbody></table>{!data.items.length && <p className="p-4">No recorded activity.</p>}</div><div className="flex items-center gap-4"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, data.pagination.pages)}</span><button className="btn-secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div></div>;
}
