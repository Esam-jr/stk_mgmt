"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import toast from "react-hot-toast";

type SaleRecord = {
  id: string;
  quantity: number;
  paymentMethod: "CASH" | "TRANSFER";
  createdAt: string;
  stock: {
    id: string;
    barcode: string;
    brand: string;
    category: string;
    size: string;
    sellingPrice: number;
  };
  soldBy: { id: string; firstName: string; lastName: string };
  branch: { id: string; name: string };
};

export default function SalesHistoryPage() {
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  const fetchSalesHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to load sales history");
      setSalesHistory(await res.json());
    } catch (error) {
      toast.error("Failed to load sales history");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return salesHistory.filter((sale) => {
      const saleTs = new Date(sale.createdAt).getTime();
      if (fromTs !== null && saleTs < fromTs) return false;
      if (toTs !== null && saleTs > toTs) return false;
      return true;
    });
  }, [salesHistory, fromDate, toDate]);

  const totalSalesAmount = filteredHistory.reduce(
    (acc, sale) => acc + sale.stock.sellingPrice * sale.quantity,
    0
  );
  const totalUnits = filteredHistory.reduce((acc, sale) => acc + sale.quantity, 0);

  const columns = [
    { header: "Date", cell: (sale: SaleRecord) => new Date(sale.createdAt).toLocaleString() },
    { header: "Product", cell: (sale: SaleRecord) => `${sale.stock.brand} - ${sale.stock.category} (${sale.stock.size})` },
    { header: "Barcode", cell: (sale: SaleRecord) => sale.stock.barcode },
    { header: "Qty", accessorKey: "quantity" as keyof SaleRecord },
    { header: "Unit Price", cell: (sale: SaleRecord) => `$${sale.stock.sellingPrice.toFixed(2)}` },
    { header: "Total", cell: (sale: SaleRecord) => `$${(sale.quantity * sale.stock.sellingPrice).toFixed(2)}` },
    { header: "Payment", accessorKey: "paymentMethod" as keyof SaleRecord },
    { header: "Branch", cell: (sale: SaleRecord) => sale.branch.name },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Sales History</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Shows only sales made by your logged-in account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Transactions</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{filteredHistory.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Units Sold</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{totalUnits}</p>
        </div>
        <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Revenue</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">${totalSalesAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => { setFromDate(""); setToDate(""); }}>
            Clear Filter
          </Button>
          <Button variant="outline" onClick={fetchSalesHistory} isLoading={isLoading}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-zinc-600 dark:text-zinc-400">Loading sales history...</div>
        ) : (
          <DataTable columns={columns} data={filteredHistory} />
        )}
      </div>
    </div>
  );
}
