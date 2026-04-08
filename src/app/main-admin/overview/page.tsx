"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Activity,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

type StockSummary = {
  totalItems: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
};

type SaleRecord = {
  id: string;
  quantity: number;
  paymentMethod: "CASH" | "TRANSFER";
  createdAt: string;
  stock: { brand: string; category: string; size: string; sellingPrice: number };
  soldBy: { firstName: string; lastName: string };
  branch: { name: string };
};

type TransferRecord = {
  id: string;
  quantity: number;
  createdAt: string;
  fromBranch: { name: string };
  toBranch: { name: string };
  stock: { brand: string; category: string; size: string };
};

export default function MainAdminOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const [stockRes, salesRes, transferRes] = await Promise.all([
          fetch("/api/reports/stock"),
          fetch("/api/sales"),
          fetch("/api/transfer"),
        ]);

        if (stockRes.ok) setStockSummary(await stockRes.json());
        if (salesRes.ok) setSales(await salesRes.json());
        if (transferRes.ok) setTransfers(await transferRes.json());
      } catch (error) {
        toast.error("Failed to load overview dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const salesRevenue = useMemo(
    () => sales.reduce((acc, sale) => acc + sale.quantity * sale.stock.sellingPrice, 0),
    [sales]
  );

  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);
  const recentTransfers = useMemo(() => transfers.slice(0, 5), [transfers]);

  if (isLoading) {
    return <div className="text-zinc-600 dark:text-zinc-400">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/70 bg-linear-to-br from-indigo-50 via-white to-cyan-50 p-6 shadow-sm dark:border-indigo-900/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/30">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-zinc-900/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Control Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Admin Overview</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Live snapshot of stock, revenue, transfers, and quick actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickAction href="/main-admin/stock" icon={Package} label="Manage Stock" hint="Add, update, and monitor branch inventory." />
            <QuickAction href="/main-admin/transfer" icon={ArrowRightLeft} label="Transfer Stock" hint="Move products between branches quickly." />
            <QuickAction href="/main-admin/reports" icon={BarChart3} label="View Reports" hint="Analyze revenue, profit, and trends." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total SKUs" value={`${stockSummary?.totalItems ?? 0}`} icon={Boxes} />
        <StatCard
          title="Inventory Value"
          value={`$${(stockSummary?.inventoryValue ?? 0).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Potential Revenue"
          value={`$${(stockSummary?.potentialRevenue ?? 0).toFixed(2)}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Low Stock Alerts"
          value={`${stockSummary?.lowStockCount ?? 0}`}
          icon={AlertTriangle}
          emphasis={(stockSummary?.lowStockCount ?? 0) > 0 ? "warning" : "normal"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sales Transactions</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{sales.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sales Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">${salesRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Transfers Logged</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{transfers.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Activity className="h-5 w-5 text-indigo-500" />
            Recent Sales
          </h2>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent sales found.</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {sale.stock.brand} - {sale.stock.category} ({sale.stock.size})
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {sale.quantity} pcs | {sale.paymentMethod} | {sale.branch.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(sale.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
            Recent Transfers
          </h2>
          <div className="space-y-3">
            {recentTransfers.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent transfers found.</p>
            ) : (
              recentTransfers.map((transfer) => (
                <div key={transfer.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {transfer.stock.brand} - {transfer.stock.category} ({transfer.stock.size})
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {transfer.fromBranch.name} to {transfer.toBranch.name} | Qty: {transfer.quantity}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(transfer.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  hint,
  icon: Icon,
}: {
  href: string;
  label: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group min-w-56 rounded-xl border border-zinc-200 bg-white/90 p-3 text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-indigo-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-indigo-500" />
            {label}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:text-indigo-500" />
      </div>
    </Link>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  emphasis = "normal",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  emphasis?: "normal" | "warning";
}) {
  const valueClass =
    emphasis === "warning" ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
        <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-950/40">
          <Icon className="h-4 w-4 text-indigo-500" />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
