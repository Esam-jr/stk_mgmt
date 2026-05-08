"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, PackageSearch, Search, Warehouse } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";

type Transfer = {
  id: string;
  productVariant: {
    barcode: string;
    size: string;
    color?: string | null;
    product: { name: string; brand: { name: string }; category: { name: string } };
  };
  fromBranch: { id: string; name: string };
  toBranch: { id: string; name: string };
  quantity: number;
  transferredBy: { firstName: string; lastName: string };
  createdAt: string;
};

type Branch = { id: string; name: string; location?: string | null };
type Stock = {
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

const emptyForm = {
  productVariantId: "",
  toBranchId: "",
  quantity: 1,
};

function stockLabel(stock: Stock) {
  return `${stock.brand} ${stock.name} (${stock.size}${stock.color ? ` / ${stock.color}` : ""})`;
}

function transferLabel(transfer: Transfer) {
  return `${transfer.productVariant.product.brand.name} ${transfer.productVariant.product.name} (${transfer.productVariant.size}${transfer.productVariant.color ? ` / ${transfer.productVariant.color}` : ""})`;
}

export function StockTransferManager() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [transferRes, stockRes, branchRes] = await Promise.all([
        fetch("/api/transfer"),
        fetch("/api/stock"),
        fetch("/api/branches"),
      ]);

      if (!transferRes.ok || !stockRes.ok || !branchRes.ok) throw new Error("Failed to load transfer data");
      setTransfers(await transferRes.json());
      setStocks(await stockRes.json());
      setBranches(await branchRes.json());
    } catch {
      toast.error("Failed to load transfer data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Transfer data is loaded from authenticated stock APIs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const selectedStock = stocks.find((stock) => stock.id === formData.productVariantId);
  const targetBranches = selectedStock ? branches.filter((branch) => branch.id !== selectedStock.branch.id) : branches;

  const availableStocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stocks
      .filter((stock) => stock.quantity > 0)
      .filter((stock) => !sourceBranchId || stock.branch.id === sourceBranchId)
      .filter((stock) => {
        if (!query) return true;
        return (
          stockLabel(stock).toLowerCase().includes(query) ||
          stock.barcode.toLowerCase().includes(query) ||
          stock.category.toLowerCase().includes(query) ||
          stock.branch.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.branch.name.localeCompare(b.branch.name) || stockLabel(a).localeCompare(stockLabel(b)));
  }, [stocks, sourceBranchId, searchQuery]);

  const filteredTransfers = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const matchesBranch =
        !historyBranchId ||
        transfer.fromBranch.id === historyBranchId ||
        transfer.toBranch.id === historyBranchId;
      if (!matchesBranch) return false;
      if (!query) return true;
      return (
        transferLabel(transfer).toLowerCase().includes(query) ||
        transfer.productVariant.barcode.toLowerCase().includes(query) ||
        transfer.fromBranch.name.toLowerCase().includes(query) ||
        transfer.toBranch.name.toLowerCase().includes(query) ||
        `${transfer.transferredBy.firstName} ${transfer.transferredBy.lastName}`.toLowerCase().includes(query)
      );
    });
  }, [transfers, historyBranchId, historyQuery]);

  const transferUnits = filteredTransfers.reduce((sum, transfer) => sum + transfer.quantity, 0);
  const inStockUnits = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const lowStockCount = stocks.filter((stock) => stock.quantity < 10).length;

  const setSelectedStock = (stock: Stock) => {
    setFormData({
      productVariantId: stock.id,
      toBranchId: "",
      quantity: Math.min(1, stock.quantity),
    });
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStock) {
      toast.error("Select a stock item first");
      return;
    }
    if (formData.quantity > selectedStock.quantity) {
      toast.error("Transfer quantity cannot exceed available stock");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: formData.productVariantId,
          toBranchId: formData.toBranchId,
          quantity: Number(formData.quantity),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Transfer failed");
      }

      toast.success("Transfer completed successfully");
      setFormData(emptyForm);
      setSearchQuery("");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Date", cell: (transfer: Transfer) => new Date(transfer.createdAt).toLocaleString() },
    { header: "Code", cell: (transfer: Transfer) => transfer.productVariant.barcode },
    { header: "Item", cell: transferLabel },
    { header: "From", cell: (transfer: Transfer) => transfer.fromBranch.name },
    { header: "To", cell: (transfer: Transfer) => transfer.toBranch.name },
    { header: "Qty", accessorKey: "quantity" as keyof Transfer },
    { header: "Transferred By", cell: (transfer: Transfer) => `${transfer.transferredBy.firstName} ${transfer.transferredBy.lastName}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Stock Transfers</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Move stock between branches while keeping source and destination quantities in sync.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard icon={Warehouse} title="Branches" value={branches.length.toLocaleString()} />
        <SummaryCard icon={PackageSearch} title="Units In Stock" value={inStockUnits.toLocaleString()} />
        <SummaryCard icon={ArrowRightLeft} title="Transferred Units" value={transferUnits.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Find Stock</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="pl-9"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search product, code, category, branch..."
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Source Branch</label>
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={sourceBranchId}
                onChange={(event) => {
                  setSourceBranchId(event.target.value);
                  setFormData(emptyForm);
                }}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
            {availableStocks.map((stock) => {
              const isSelected = stock.id === formData.productVariantId;
              return (
                <button
                  key={stock.id}
                  type="button"
                  onClick={() => setSelectedStock(stock)}
                  className={`rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                      : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{stockLabel(stock)}</p>
                      <p className="mt-1 text-xs text-zinc-500">{stock.category} | Code {stock.barcode}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-500" />}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-zinc-500">Branch</p>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{stock.branch.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Available</p>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{stock.quantity}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Value</p>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">${(stock.quantity * stock.priceIn).toFixed(2)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {availableStocks.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No transferable stock matches your filters.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Transfer Details</h2>
          <form onSubmit={handleTransfer} className="mt-4 space-y-4">
            {selectedStock ? (
              <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-950">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{stockLabel(selectedStock)}</p>
                <p className="mt-1 text-zinc-500">From {selectedStock.branch.name} | {selectedStock.quantity} available</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-800">
                Select an item from the stock list to begin.
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Destination Branch</label>
              <select
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={formData.toBranchId}
                onChange={(event) => setFormData({ ...formData, toBranchId: event.target.value })}
                required
                disabled={!selectedStock}
              >
                <option value="">Select destination...</option>
                {targetBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Quantity</label>
              <Input
                type="number"
                min={1}
                max={selectedStock?.quantity ?? 1}
                value={formData.quantity}
                onChange={(event) => setFormData({ ...formData, quantity: Number(event.target.value) })}
                required
                disabled={!selectedStock}
              />
            </div>

            <Button
              className="w-full"
              type="submit"
              isLoading={isSubmitting}
              disabled={!selectedStock || !formData.toBranchId || formData.quantity < 1 || formData.quantity > (selectedStock?.quantity ?? 0)}
            >
              Transfer Stock
            </Button>

            {lowStockCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {lowStockCount} stock variant(s) are below 10 units. Review quantities before moving inventory.
              </p>
            )}
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Search Transfer History</label>
            <Input
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Search item, code, branch, user..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Branch</label>
            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              value={historyBranchId}
              onChange={(event) => setHistoryBranchId(event.target.value)}
            >
              <option value="">All transfer branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-zinc-600 dark:text-zinc-400">Loading transfer history...</div>
        ) : (
          <DataTable columns={columns} data={filteredTransfers} />
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Warehouse;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
        <Icon className="h-4 w-4 text-indigo-500" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
