"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Activity, AlertTriangle, Boxes, Download, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Branch = { id: string; name: string };

type SalesBreakdown = {
  range: { start: string; end: string };
  totals: { revenue: number; profit: number; units: number; transactions: number };
  daily: { date: string; revenue: number; profit: number; count: number; transactions: number }[];
  byBranch: { branchId: string; branch: string; revenue: number; profit: number; units: number; transactions: number }[];
  byCategory: { category: string; revenue: number; profit: number; units: number }[];
  byPaymentMethod: { method: string; revenue: number; transactions: number }[];
  topProducts: { product: string; brand: string; category: string; revenue: number; profit: number; units: number }[];
  recentSales: {
    id: string;
    date: string;
    branch: string;
    product: string;
    brand: string;
    size: string;
    color?: string | null;
    quantity: number;
    paymentMethod: string;
    soldBy: string;
    revenue: number;
    profit: number;
  }[];
};

type StockRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  color?: string | null;
  barcode: string;
  quantity: number;
  priceIn: number;
  sellingPrice: number;
  branch: { id: string; name: string };
};

type StockSummary = {
  totalItems: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  stocks: StockRow[];
};

const pieColors = ["#4f46e5", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function number(value: number) {
  return value.toLocaleString();
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function exportCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    toast.error("No report data to export");
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
  const [salesData, setSalesData] = useState<SalesBreakdown | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(today);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({ detail: "true", start: startDate, end: endDate });
    if (branchId) params.set("branchId", branchId);

    const stockParams = new URLSearchParams();
    if (branchId) stockParams.set("branchId", branchId);

    try {
      const [salesRes, stockRes, branchesRes] = await Promise.all([
        fetch(`/api/reports/sales?${params}`),
        fetch(`/api/reports/stock${stockParams.toString() ? `?${stockParams}` : ""}`),
        fetch("/api/branches"),
      ]);

      if (!salesRes.ok || !stockRes.ok || !branchesRes.ok) throw new Error("Failed to load report data");
      setSalesData(await salesRes.json());
      setStockSummary(await stockRes.json());
      setBranches(await branchesRes.json());
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, endDate, startDate]);

  useEffect(() => {
    // Reports are client-side filters over authenticated API data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const lowStockRows = useMemo(
    () => (stockSummary?.stocks ?? []).filter((stock) => stock.quantity < 10).sort((a, b) => a.quantity - b.quantity).slice(0, 12),
    [stockSummary]
  );

  const stockByBranch = useMemo(() => {
    const rows = new Map<string, { branch: string; units: number; value: number; skus: number }>();
    for (const stock of stockSummary?.stocks ?? []) {
      const row = rows.get(stock.branch.id) ?? { branch: stock.branch.name, units: 0, value: 0, skus: 0 };
      row.units += stock.quantity;
      row.value += stock.quantity * stock.priceIn;
      row.skus += 1;
      rows.set(stock.branch.id, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.value - a.value);
  }, [stockSummary]);

  const stockByCategory = useMemo(() => {
    const rows = new Map<string, { category: string; units: number; value: number }>();
    for (const stock of stockSummary?.stocks ?? []) {
      const row = rows.get(stock.category) ?? { category: stock.category, units: 0, value: 0 };
      row.units += stock.quantity;
      row.value += stock.quantity * stock.priceIn;
      rows.set(stock.category, row);
    }
    return Array.from(rows.values()).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [stockSummary]);

  const grossMargin = salesData && salesData.totals.revenue > 0 ? (salesData.totals.profit / salesData.totals.revenue) * 100 : 0;
  const sellThrough =
    salesData && stockSummary
      ? (salesData.totals.units / Math.max(salesData.totals.units + stockSummary.stocks.reduce((sum, stock) => sum + stock.quantity, 0), 1)) * 100
      : 0;
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  const handleExport = () => {
    const rows = [
      ...(salesData?.byBranch ?? []).map((row) => ({
        Section: "Sales by branch",
        Name: row.branch,
        Revenue: row.revenue,
        Profit: row.profit,
        Units: row.units,
        Transactions: row.transactions,
      })),
      ...(salesData?.topProducts ?? []).map((row) => ({
        Section: "Top product",
        Name: `${row.brand} ${row.product}`,
        Revenue: row.revenue,
        Profit: row.profit,
        Units: row.units,
        Transactions: "",
      })),
      ...lowStockRows.map((row) => ({
        Section: "Low stock",
        Name: `${row.brand} ${row.name} ${row.size}${row.color ? `/${row.color}` : ""}`,
        Revenue: "",
        Profit: "",
        Units: row.quantity,
        Transactions: "",
      })),
    ];
    exportCsv(`super-admin-report-${startDate}-to-${endDate}.csv`, rows);
  };

  if (isLoading && !salesData && !stockSummary) {
    return <div className="text-zinc-600 dark:text-zinc-400">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {selectedBranch ? `${selectedBranch.name} performance` : "All branch performance"} from {startDate} to {endDate}.
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
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Start</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">End</label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
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
        <MetricCard title="Revenue" value={money(salesData?.totals.revenue ?? 0)} icon={Wallet} />
        <MetricCard title="Gross Profit" value={money(salesData?.totals.profit ?? 0)} icon={TrendingUp} />
        <MetricCard title="Gross Margin" value={percent(grossMargin)} icon={Activity} />
        <MetricCard title="Units Sold" value={number(salesData?.totals.units ?? 0)} icon={Boxes} />
        <MetricCard title="Inventory Value" value={money(stockSummary?.inventoryValue ?? 0)} icon={Boxes} />
        <MetricCard title="Low Stock" value={number(stockSummary?.lowStockCount ?? 0)} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportPanel title="Revenue, Profit & Units" className="xl:col-span-2">
          <div className="mb-3 text-xs text-zinc-500">Sell-through {percent(sellThrough)}</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData?.daily ?? []} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="money" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <YAxis yAxisId="units" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => name === "Units" ? number(Number(value)) : money(Number(value))} />
                <Area yAxisId="money" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.14} />
                <Area yAxisId="money" type="monotone" dataKey="profit" name="Profit" stroke="#0f766e" fill="#0f766e" fillOpacity={0.12} />
                <Area yAxisId="units" type="monotone" dataKey="count" name="Units" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel title="Payment Mix">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesData?.byPaymentMethod ?? []} dataKey="revenue" nameKey="method" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {(salesData?.byPaymentMethod ?? []).map((entry, index) => (
                    <Cell key={entry.method} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {(salesData?.byPaymentMethod ?? []).map((row, index) => (
              <div key={row.method} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[index % pieColors.length] }} />
                  {row.method}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{money(row.revenue)}</span>
              </div>
            ))}
          </div>
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportPanel title="Branch Performance">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData?.byBranch ?? []} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="branch" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel title="Inventory by Category">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByCategory} layout="vertical" margin={{ left: 18, right: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="category" type="category" width={92} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => name === "units" ? number(Number(value)) : money(Number(value))} />
                <Bar dataKey="value" name="Value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportPanel title="Top Products" className="xl:col-span-2">
          <ReportTable
            headers={["Product", "Category", "Units", "Revenue", "Profit"]}
            rows={(salesData?.topProducts ?? []).map((row) => [
              `${row.brand} ${row.product}`,
              row.category,
              number(row.units),
              money(row.revenue),
              money(row.profit),
            ])}
          />
        </ReportPanel>

        <ReportPanel title="Inventory by Branch">
          <ReportTable
            headers={["Branch", "SKUs", "Units", "Value"]}
            rows={stockByBranch.map((row) => [row.branch, number(row.skus), number(row.units), money(row.value)])}
          />
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportPanel title="Low Stock Watchlist">
          <ReportTable
            headers={["Code", "Item", "Branch", "Qty"]}
            rows={lowStockRows.map((row) => [
              row.barcode,
              `${row.brand} ${row.name} (${row.size}${row.color ? ` / ${row.color}` : ""})`,
              row.branch.name,
              number(row.quantity),
            ])}
          />
        </ReportPanel>

        <ReportPanel title="Recent Sales">
          <ReportTable
            headers={["Date", "Item", "Branch", "Sold By", "Revenue"]}
            rows={(salesData?.recentSales ?? []).map((row) => [
              new Date(row.date).toLocaleString(),
              `${row.brand} ${row.product} (${row.size}${row.color ? ` / ${row.color}` : ""})`,
              row.branch,
              row.soldBy,
              money(row.revenue),
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
  icon: typeof Wallet;
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
                No data for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
