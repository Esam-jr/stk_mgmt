"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Building2,
  ArrowRightLeft,
  BarChart3,
  Package,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

type StockSummary = {
  totalItems: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
};

export default function SuperAdminOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [usersCount, setUsersCount] = useState(0);
  const [branchesCount, setBranchesCount] = useState(0);
  const [transfersCount, setTransfersCount] = useState(0);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const [usersRes, branchesRes, transfersRes, stockRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/branches"),
          fetch("/api/transfer"),
          fetch("/api/reports/stock"),
        ]);

        if (usersRes.ok) setUsersCount((await usersRes.json()).length);
        if (branchesRes.ok) setBranchesCount((await branchesRes.json()).length);
        if (transfersRes.ok) setTransfersCount((await transfersRes.json()).length);
        if (stockRes.ok) setStockSummary(await stockRes.json());
      } catch (error) {
        toast.error("Failed to load overview");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (isLoading) return <div className="text-zinc-600 dark:text-zinc-400">Loading overview...</div>;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-200/70 bg-linear-to-br from-cyan-50 via-white to-indigo-50 p-6 shadow-sm dark:border-indigo-900/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/20">
        <div className="absolute -top-14 right-20 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="absolute -bottom-12 left-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-900/60 dark:bg-zinc-900/70 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Executive Snapshot
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Super Admin Overview</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Monitor users, branches, inventory, and system-wide operations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Users" value={usersCount} icon={Users} />
        <Stat title="Total Branches" value={branchesCount} icon={Building2} />
        <Stat title="Total Transfers" value={transfersCount} icon={ArrowRightLeft} />
        <Stat title="Total SKUs" value={stockSummary?.totalItems ?? 0} icon={Package} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric title="Inventory Value" value={`$${(stockSummary?.inventoryValue ?? 0).toFixed(2)}`} />
        <Metric title="Potential Revenue" value={`$${(stockSummary?.potentialRevenue ?? 0).toFixed(2)}`} />
        <Metric title="Low Stock Alerts" value={`${stockSummary?.lowStockCount ?? 0}`} />
      </div>

      <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          <LayoutDashboard className="h-5 w-5 text-indigo-500" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Action href="/super-admin/users" label="Manage Users" />
          <Action href="/super-admin/branches" label="Manage Branches" />
          <Action href="/super-admin/transfer" label="Manage Transfers" />
          <Action href="/super-admin/reports" label="Open Reports" />
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
        <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-950/40">
          <Icon className="h-4 w-4 text-indigo-500" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-800"
    >
      {label}
      <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:text-indigo-500" />
    </Link>
  );
}
