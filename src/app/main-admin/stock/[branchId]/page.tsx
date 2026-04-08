"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

type Stock = {
  id: string;
  category: string;
  brand: string;
  size: string;
  quantity: number;
  barcode: string;
  sellingPrice: number;
  branch: { id: string; name: string };
};

type Branch = { id: string; name: string };
type BranchStats = {
  totalSkus: number;
  totalUnits: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  salesRevenue30d: number;
  salesProfit30d: number;
  unitsSold30d: number;
  salesUsersCount: number;
  transferInCount: number;
  transferOutCount: number;
};

export default function BranchStockPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchStats, setBranchStats] = useState<BranchStats | null>(null);

  const [formData, setFormData] = useState({
    category: "",
    brand: "",
    size: "",
    quantity: 0,
    priceIn: 0,
    sellingPrice: 0,
  });

  useEffect(() => {
    if (!branchId) return;
    fetchBranchData();
  }, [branchId]);

  const currentBranch = useMemo(
    () => branches.find((branch) => branch.id === branchId),
    [branches, branchId]
  );

  const fetchBranchData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, branchesRes, statsRes] = await Promise.all([
        fetch(`/api/stock?branchId=${branchId}`),
        fetch("/api/branches"),
        fetch(`/api/branches/${branchId}/stats`),
      ]);

      if (stockRes.ok) setStocks(await stockRes.json());
      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (statsRes.ok) {
        const payload = await statsRes.json();
        setBranchStats(payload.stats);
      }
    } catch (error) {
      toast.error("Failed to load branch stock");
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
          branchId,
          quantity: Number(formData.quantity),
          priceIn: Number(formData.priceIn),
          sellingPrice: Number(formData.sellingPrice),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Stock created successfully");
      setIsModalOpen(false);
      setFormData({
        category: "",
        brand: "",
        size: "",
        quantity: 0,
        priceIn: 0,
        sellingPrice: 0,
      });
      fetchBranchData();
    } catch (error) {
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {currentBranch ? `${currentBranch.name} Stock` : "Branch Stock"}
          </h1>
          <Link href="/main-admin/stock" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Back to branches
          </Link>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add Stock</Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : (
        <>
          {branchStats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard title="Total SKUs" value={branchStats.totalSkus.toLocaleString()} />
              <StatCard title="Units In Stock" value={branchStats.totalUnits.toLocaleString()} />
              <StatCard title="Inventory Value" value={`$${branchStats.inventoryValue.toFixed(2)}`} />
              <StatCard title="Potential Revenue" value={`$${branchStats.potentialRevenue.toFixed(2)}`} />
              <StatCard title="Low Stock Items" value={branchStats.lowStockCount.toLocaleString()} />
              <StatCard title="30d Revenue" value={`$${branchStats.salesRevenue30d.toFixed(2)}`} />
              <StatCard title="30d Profit" value={`$${branchStats.salesProfit30d.toFixed(2)}`} />
              <StatCard title="30d Units Sold" value={branchStats.unitsSold30d.toLocaleString()} />
              <StatCard title="Sales Users" value={branchStats.salesUsersCount.toLocaleString()} />
              <StatCard title="Transfers (In/Out)" value={`${branchStats.transferInCount}/${branchStats.transferOutCount}`} />
            </div>
          )}
          <DataTable columns={columns} data={stocks} />
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Stock Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Brand</label>
              <Input required value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Category</label>
              <Input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Size</label>
              <Input required value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Quantity</label>
              <Input
                type="number"
                required
                min={0}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Buy Price</label>
              <Input
                type="number"
                step="0.01"
                required
                min={0}
                value={formData.priceIn}
                onChange={(e) => setFormData({ ...formData, priceIn: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Sell Price</label>
              <Input
                type="number"
                step="0.01"
                required
                min={0}
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
