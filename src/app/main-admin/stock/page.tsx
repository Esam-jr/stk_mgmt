"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

type Branch = { id: string; name: string; location?: string | null };

export default function StockPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed");
      setBranches(await res.json());
    } catch (e) {
      toast.error("Failed to load branches");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Branch Stock Management</h1>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : branches.length === 0 ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No branches available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{branch.name}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {branch.location || "No location provided"}
              </p>
              <Link href={`/main-admin/stock/${branch.id}`} className="mt-4 inline-block">
                <Button>Manage Branch</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
