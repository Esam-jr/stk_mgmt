"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

type Transfer = {
  id: string;
  stock: { category: string; brand: string; size: string; barcode: string };
  fromBranch: { id: string; name: string };
  toBranch: { id: string; name: string };
  quantity: number;
  transferredBy: { firstName: string; lastName: string };
  createdAt: string;
};

type Branch = { id: string; name: string };
type Stock = {
  id: string;
  brand: string;
  category: string;
  size: string;
  quantity: number;
  branch: { id: string; name: string };
};

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    stockId: "",
    toBranchId: "",
    quantity: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transferRes, stockRes, branchRes] = await Promise.all([
        fetch("/api/transfer"),
        fetch("/api/stock"),
        fetch("/api/branches"),
      ]);

      if (transferRes.ok) setTransfers(await transferRes.json());
      if (stockRes.ok) setStocks(await stockRes.json());
      if (branchRes.ok) setBranches(await branchRes.json());
    } catch (e) {
      toast.error("Failed to load transfer data");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStock = stocks.find((stock) => stock.id === formData.stockId);
  const targetBranches = selectedStock
    ? branches.filter((branch) => branch.id !== selectedStock.branch.id)
    : branches;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: formData.stockId,
          toBranchId: formData.toBranchId,
          quantity: Number(formData.quantity),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Transfer failed");
      }

      toast.success("Transfer completed successfully");
      setIsModalOpen(false);
      setFormData({ stockId: "", toBranchId: "", quantity: 1 });
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Date", cell: (t: Transfer) => new Date(t.createdAt).toLocaleDateString() },
    { header: "Item", cell: (t: Transfer) => `${t.stock.brand} - ${t.stock.category} (${t.stock.size})` },
    { header: "From", cell: (t: Transfer) => t.fromBranch.name },
    { header: "To", cell: (t: Transfer) => t.toBranch.name },
    { header: "Quantity", accessorKey: "quantity" as keyof Transfer },
    { header: "Transferred By", cell: (t: Transfer) => `${t.transferredBy.firstName} ${t.transferredBy.lastName}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Stock Transfers</h1>
        <Button onClick={() => setIsModalOpen(true)}>Initiate Transfer</Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={transfers} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Transfer Stock">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Stock Item</label>
            <select
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              value={formData.stockId}
              onChange={(e) => setFormData({ stockId: e.target.value, toBranchId: "", quantity: 1 })}
              required
            >
              <option value="">Select stock item...</option>
              {stocks
                .filter((stock) => stock.quantity > 0)
                .map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.brand} - {stock.category} ({stock.size}) | {stock.branch.name} | Qty: {stock.quantity}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Destination Branch</label>
            <select
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              value={formData.toBranchId}
              onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
              required
              disabled={!formData.stockId}
            >
              <option value="">Select destination...</option>
              {targetBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
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
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              required
            />
            {selectedStock && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Available in source branch: {selectedStock.quantity}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!formData.stockId || !formData.toBranchId || formData.quantity < 1}
            >
              Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
