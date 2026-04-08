"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

type Stock = {
  id: string; category: string; brand: string; size: string;
  quantity: number; barcode: string; priceIn: number; sellingPrice: number;
  branch: { id: string; name: string };
};
type Branch = { id: string; name: string };

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("all");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "", brand: "", size: "", quantity: 0, priceIn: 0, sellingPrice: 0, branchId: ""
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStock();
  }, [activeBranch]);

  const fetchBranches = async () => {
    const res = await fetch("/api/branches");
    if (res.ok) setBranches(await res.json());
  };

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const url = activeBranch === "all" ? "/api/stock" : `/api/stock?branchId=${activeBranch}`;
      const res = await fetch(url);
      if (res.ok) setStocks(await res.json());
    } catch (e) {
      toast.error("Failed to load stock");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          priceIn: Number(formData.priceIn),
          sellingPrice: Number(formData.sellingPrice)
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Stock created successfully");
      setIsModalOpen(false);
      setFormData({ category: "", brand: "", size: "", quantity: 0, priceIn: 0, sellingPrice: 0, branchId: "" });
      fetchStock();
    } catch (e) {
      toast.error("Failed to create stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Barcode", accessorKey: "barcode" as keyof Stock },
    { header: "Brand", accessorKey: "brand" as keyof Stock },
    { header: "Category", accessorKey: "category" as keyof Stock },
    { header: "Size", accessorKey: "size" as keyof Stock },
    { header: "Qty", accessorKey: "quantity" as keyof Stock },
    { header: "Price", cell: (s: Stock) => `$${s.sellingPrice.toFixed(2)}` },
    { header: "Branch", cell: (s: Stock) => s.branch.name },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Stock Management</h1>
        <div className="flex gap-4 items-center">
          <select 
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
          >
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button onClick={() => setIsModalOpen(true)}>Add Stock</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={stocks} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Stock Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Brand</label>
              <Input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Category</label>
              <Input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Size</label>
              <Input required value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Quantity</label>
              <Input type="number" required min={0} value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Buy Price</label>
              <Input type="number" step="0.01" required min={0} value={formData.priceIn} onChange={e => setFormData({ ...formData, priceIn: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Sell Price</label>
              <Input type="number" step="0.01" required min={0} value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Assign to Branch</label>
            <select 
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              required
              value={formData.branchId} 
              onChange={e => setFormData({ ...formData, branchId: e.target.value })}
            >
              <option value="">Select a branch...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Create Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
