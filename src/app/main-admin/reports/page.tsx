"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, Download, PackageSearch, RefreshCw, Tags, Warehouse } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

type Branch = { id: string; name: string; location?: string | null };

type StockRow = {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  color?: string | null;
  barcode: string;
  quantity: number;
  priceIn: number;
  sellingPrice: number;
  branch: Branch;
};

type StockSummary = {
  totalItems: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  stocks: StockRow[];
};

const chartColors = ["#4f46e5", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#65a30d"];

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function number(value: number) {
  return value.toLocaleString();
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function variantLabel(stock: StockRow) {
  return `${stock.brand} ${stock.name} (${stock.size}${stock.color ? ` / ${stock.color}` : ""})`;
}

function exportCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    toast.error("No stock data to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [branchId, setBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);

    try {
      const [stockRes, branchesRes] = await Promise.all([
        fetch(`/api/reports/stock${params.toString() ? `?${params}` : ""}`),
        fetch("/api/branches"),
      ]);

      if (!stockRes.ok || !branchesRes.ok) throw new Error("Failed to load stock reports");
      setStockSummary(await stockRes.json());
      setBranches(await branchesRes.json());
    } catch {
      toast.error("Failed to load stock reports");
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    // Reports are loaded from authenticated stock APIs and refreshed by branch filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const stocks = useMemo(() => stockSummary?.stocks ?? [], [stockSummary]);
  const totalUnits = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const potentialProfit = (stockSummary?.potentialRevenue ?? 0) - (stockSummary?.inventoryValue ?? 0);
  const margin = stockSummary?.potentialRevenue ? (potentialProfit / stockSummary.potentialRevenue) * 100 : 0;
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  const branchRows = useMemo(() => {
    const rows = new Map<string, { branch: string; location: string; skus: number; units: number; value: number; revenue: number; lowStock: number }>();
    for (const stock of stocks) {
      const row = rows.get(stock.branch.id) ?? {
        branch: stock.branch.name,
        location: stock.branch.location ?? "No location",
        skus: 0,
        units: 0,
        value: 0,
        revenue: 0,
        lowStock: 0,
      };
      row.skus += 1;
      row.units += stock.quantity;
      row.value += stock.quantity * stock.priceIn;
      row.revenue += stock.quantity * stock.sellingPrice;
      if (stock.quantity < 10) row.lowStock += 1;
      rows.set(stock.branch.id, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.value - a.value);
  }, [stocks]);

  const categoryRows = useMemo(() => {
    const rows = new Map<string, { category: string; skus: number; units: number; value: number; revenue: number }>();
    for (const stock of stocks) {
      const row = rows.get(stock.category) ?? { category: stock.category, skus: 0, units: 0, value: 0, revenue: 0 };
      row.skus += 1;
      row.units += stock.quantity;
      row.value += stock.quantity * stock.priceIn;
      row.revenue += stock.quantity * stock.sellingPrice;
      rows.set(stock.category, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.value - a.value);
  }, [stocks]);

  const brandRows = useMemo(() => {
    const rows = new Map<string, { brand: string; skus: number; units: number; value: number }>();
    for (const stock of stocks) {
      const row = rows.get(stock.brand) ?? { brand: stock.brand, skus: 0, units: 0, value: 0 };
      row.skus += 1;
      row.units += stock.quantity;
      row.value += stock.quantity * stock.priceIn;
      rows.set(stock.brand, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [stocks]);

  const lowStockRows = useMemo(
    () => stocks.filter((stock) => stock.quantity < 10).sort((a, b) => a.quantity - b.quantity),
    [stocks]
  );

  const highValueRows = useMemo(
    () => [...stocks].sort((a, b) => b.quantity * b.priceIn - a.quantity * a.priceIn).slice(0, 10),
    [stocks]
  );

  const handleExport = () => {
    exportCsv(
      `main-admin-stock-report-${selectedBranch?.name ?? "all-branches"}.csv`,
      stocks.map((stock) => ({
        Branch: stock.branch.name,
        Code: stock.barcode,
        Product: stock.name,
        Brand: stock.brand,
        Category: stock.category,
        Size: stock.size,
        Color: stock.color ?? "",
        Quantity: stock.quantity,
        "Inventory Value": stock.quantity * stock.priceIn,
        "Potential Revenue": stock.quantity * stock.sellingPrice,
      }))
    );
  };

  if (isLoading && !stockSummary) {
    return <div className="text-zinc-600 dark:text-zinc-400">Loading stock reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Stock Reports</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {selectedBranch ? `${selectedBranch.name} inventory` : "Inventory across all branches"}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Branch</label>
            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={fetchData} isLoading={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Branches" value={number(branchRows.length)} icon={Warehouse} />
        <MetricCard title="SKUs" value={number(stockSummary?.totalItems ?? 0)} icon={PackageSearch} />
        <MetricCard title="Units" value={number(totalUnits)} icon={Boxes} />
        <MetricCard title="Inventory Value" value={money(stockSummary?.inventoryValue ?? 0)} icon={Warehouse} />
        <MetricCard title="Potential Profit" value={money(potentialProfit)} icon={Tags} />
        <MetricCard title="Low Stock" value={number(stockSummary?.lowStockCount ?? 0)} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportPanel title="Branch Inventory Value" className="xl:col-span-2">
          <div className="mb-3 text-xs text-zinc-500">Potential margin {percent(margin)}</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchRows} margin={{ left: 0, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="branch" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="value" name="Inventory Value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Potential Revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel title="Brand Mix">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={brandRows} dataKey="value" nameKey="brand" innerRadius={58} outerRadius={96} paddingAngle={3}>
                  {brandRows.map((row, index) => (
                    <Cell key={row.brand} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {brandRows.map((row, index) => (
              <div key={row.brand} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                  {row.brand}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{money(row.value)}</span>
              </div>
            ))}
          </div>
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportPanel title="Category Breakdown">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRows.slice(0, 8)} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="category" type="category" width={92} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="value" name="Inventory Value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel title="Branch Summary">
          <ReportTable
            headers={["Branch", "Location", "SKUs", "Units", "Value", "Low"]}
            rows={branchRows.map((row) => [
              row.branch,
              row.location,
              number(row.skus),
              number(row.units),
              money(row.value),
              number(row.lowStock),
            ])}
          />
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportPanel title="High Value Stock">
          <ReportTable
            headers={["Code", "Item", "Branch", "Qty", "Value"]}
            rows={highValueRows.map((stock) => [
              stock.barcode,
              variantLabel(stock),
              stock.branch.name,
              number(stock.quantity),
              money(stock.quantity * stock.priceIn),
            ])}
          />
        </ReportPanel>

        <ReportPanel title="Low Stock Watchlist">
          <ReportTable
            headers={["Code", "Item", "Branch", "Qty"]}
            rows={lowStockRows.slice(0, 15).map((stock) => [
              stock.barcode,
              variantLabel(stock),
              stock.branch.name,
              number(stock.quantity),
            ])}
          />
        </ReportPanel>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "normal",
}: {
  title: string;
  value: string;
  icon: typeof Warehouse;
  tone?: "normal" | "warning";
}) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
        <Icon className={tone === "warning" ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-indigo-500"} />
      </div>
      <p className={tone === "warning" ? "mt-2 text-2xl font-semibold text-amber-600" : "mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100"}>
        {value}
      </p>
    </div>
  );
}

function ReportPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-2 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="text-zinc-700 dark:text-zinc-300">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-2 py-2">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-2 py-6 text-center text-zinc-500">
                No stock data for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
