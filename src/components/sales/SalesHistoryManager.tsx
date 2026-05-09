"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Branch = { id: string; name: string };

type SaleRecord = {
  id: string;
  quantity: number;
  paymentMethod: "CASH" | "TRANSFER";
  createdAt: string;
  productVariant: {
    id: string;
    barcode: string;
    size: string;
    color?: string | null;
    product: {
      name: string;
      brand: { id: string; name: string };
      category: { name: string };
      sellingPrice: number | string;
    };
  };
  soldBy: { id: string; firstName: string; lastName: string };
  branch: { id: string; name: string };
  saleReturns: {
    id: string;
    quantity: number;
    createdAt: string;
    refundedBy: { firstName: string; lastName: string } | null;
  }[];
};

type SalesHistoryManagerProps = {
  showBranchFilter?: boolean;
  description: string;
};

function brandName(sale: SaleRecord) {
  return sale.productVariant.product.brand.name;
}

function unitPrice(sale: SaleRecord) {
  return Number(sale.productVariant.product.sellingPrice);
}

function itemLabel(sale: SaleRecord) {
  return `${brandName(sale)} - ${sale.productVariant.product.name} (${sale.productVariant.size}${sale.productVariant.color ? ` / ${sale.productVariant.color}` : ""})`;
}

function returnedQuantity(sale: SaleRecord) {
  return sale.saleReturns?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
}

function returnableQuantity(sale: SaleRecord) {
  return sale.quantity - returnedQuantity(sale);
}

export function SalesHistoryManager({ showBranchFilter = false, description }: SalesHistoryManagerProps) {
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchId, setBranchId] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const fetchSalesHistory = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (showBranchFilter && branchId) params.set("branchId", branchId);

    try {
      const [salesRes, branchesRes] = await Promise.all([
        fetch(`/api/sales${params.toString() ? `?${params}` : ""}`),
        showBranchFilter ? fetch("/api/branches") : Promise.resolve(null),
      ]);

      if (!salesRes.ok) throw new Error("Failed to load sales history");
      setSalesHistory(await salesRes.json());

      if (branchesRes && branchesRes.ok) {
        setBranches(await branchesRes.json());
      }
    } catch {
      toast.error("Failed to load sales history");
    } finally {
      setIsLoading(false);
    }
  }, [branchId, showBranchFilter]);

  useEffect(() => {
    // Sales history is loaded from authenticated API data and refreshed by filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSalesHistory();
  }, [fetchSalesHistory]);

  const filteredHistory = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    const query = searchQuery.trim().toLowerCase();

    return salesHistory.filter((sale) => {
      const saleTs = new Date(sale.createdAt).getTime();
      if (fromTs !== null && saleTs < fromTs) return false;
      if (toTs !== null && saleTs > toTs) return false;
      if (!query) return true;

      return (
        itemLabel(sale).toLowerCase().includes(query) ||
        sale.productVariant.barcode.toLowerCase().includes(query) ||
        sale.branch.name.toLowerCase().includes(query) ||
        `${sale.soldBy.firstName} ${sale.soldBy.lastName}`.toLowerCase().includes(query) ||
        sale.paymentMethod.toLowerCase().includes(query)
      );
    });
  }, [salesHistory, fromDate, toDate, searchQuery]);

  const totalSalesAmount = filteredHistory.reduce((acc, sale) => acc + unitPrice(sale) * sale.quantity, 0);
  const totalUnits = filteredHistory.reduce((acc, sale) => acc + sale.quantity, 0);

  const columns = [
    { header: "Date", cell: (sale: SaleRecord) => new Date(sale.createdAt).toLocaleString() },
    { header: "Product", cell: itemLabel },
    { header: "Barcode", cell: (sale: SaleRecord) => sale.productVariant.barcode },
    { header: "Qty", accessorKey: "quantity" as keyof SaleRecord },
    {
      header: "Returned",
      cell: (sale: SaleRecord) => {
        if (!sale.saleReturns?.length) return "-";
        return (
          <div className="space-y-1">
            {sale.saleReturns.map((item) => (
              <div key={item.id} className="text-xs text-zinc-700 dark:text-zinc-200">
                {item.quantity} returned on {new Date(item.createdAt).toLocaleDateString()}
                {item.refundedBy ? ` by ${item.refundedBy.firstName} ${item.refundedBy.lastName}` : ""}
              </div>
            ))}
          </div>
        );
      },
    },
    { header: "Unit Price", cell: (sale: SaleRecord) => `$${unitPrice(sale).toFixed(2)}` },
    { header: "Total", cell: (sale: SaleRecord) => `$${(sale.quantity * unitPrice(sale)).toFixed(2)}` },
    { header: "Payment", accessorKey: "paymentMethod" as keyof SaleRecord },
    {
      header: "Actions",
      cell: (sale: SaleRecord) => {
        const remaining = returnableQuantity(sale);
        return remaining > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedSale(sale);
              setReturnQuantity(1);
              setIsReturnOpen(true);
            }}
          >
            Return {remaining}
          </Button>
        ) : (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Returned</span>
        );
      },
    },
    { header: "Branch", cell: (sale: SaleRecord) => sale.branch.name },
    ...(showBranchFilter
      ? [{ header: "Sold By", cell: (sale: SaleRecord) => `${sale.soldBy.firstName} ${sale.soldBy.lastName}` }]
      : []),
  ];

  const closeReturnModal = () => {
    setIsReturnOpen(false);
    setSelectedSale(null);
    setReturnQuantity(1);
  };

  const handleConfirmReturn = async () => {
    if (!selectedSale) return;

    const maxReturnable = returnableQuantity(selectedSale);
    if (returnQuantity < 1 || returnQuantity > maxReturnable) {
      toast.error(`Enter a return quantity between 1 and ${maxReturnable}.`);
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const response = await fetch("/api/sales/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: selectedSale.id, quantity: returnQuantity }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Return failed");
      }

      toast.success(`Returned ${returnQuantity} unit(s) successfully.`);
      closeReturnModal();
      await fetchSalesHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Return failed");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Sales History</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard title="Transactions" value={filteredHistory.length.toLocaleString()} />
        <SummaryCard title="Units Sold" value={totalUnits.toLocaleString()} />
        <SummaryCard title="Revenue" value={`$${totalSalesAmount.toFixed(2)}`} />
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, code, branch, seller, payment..."
              />
            </div>
          </div>
          {showBranchFilter && (
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Branch</label>
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => { setFromDate(""); setToDate(""); setSearchQuery(""); setBranchId(""); }}>
              Clear
            </Button>
            <Button variant="outline" onClick={fetchSalesHistory} isLoading={isLoading}>
              Refresh
            </Button>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Displaying {filteredHistory.length} of {salesHistory.length} sales.
        </p>

        {isLoading ? (
          <div className="text-zinc-600 dark:text-zinc-400">Loading sales history...</div>
        ) : (
          <DataTable columns={columns} data={filteredHistory} />
        )}
      </div>

      <Modal isOpen={isReturnOpen} onClose={closeReturnModal} title="Return Sold Item">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedSale
              ? `Return units for ${itemLabel(selectedSale)}. You can return up to ${returnableQuantity(selectedSale)} unit(s).`
              : "Select a sale to return."}
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Return Quantity</label>
            <Input
              type="number"
              min={1}
              max={selectedSale ? returnableQuantity(selectedSale) : 1}
              value={returnQuantity}
              onChange={(event) => setReturnQuantity(Number(event.target.value))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeReturnModal} disabled={isSubmittingReturn}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReturn} isLoading={isSubmittingReturn}>
              Confirm Return
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
