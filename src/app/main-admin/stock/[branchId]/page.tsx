"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Eye, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type Stock = {
  id: string;
  productId: string;
  name: string;
  category: string;
  categoryId: string;
  brand: string;
  size: string;
  color?: string | null;
  quantity: number;
  barcode: string;
  priceIn: number;
  sellingPrice: number;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
};

type Branch = { id: string; name: string };
type Category = { id: string; name: string };
type Brand = { id: string; name: string };
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [activeStock, setActiveStock] = useState<Stock | null>(null);
  const [branchStats, setBranchStats] = useState<BranchStats | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    brand: "",
    size: "",
    color: "",
    quantity: 0,
    priceIn: 0,
    sellingPrice: 0,
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    brand: "",
    size: "",
    color: "",
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
      const [stockRes, branchesRes, statsRes, categoriesRes, brandsRes] = await Promise.all([
        fetch(`/api/stock?branchId=${branchId}`),
        fetch("/api/branches"),
        fetch(`/api/branches/${branchId}/stats`),
        fetch("/api/categories"),
        fetch("/api/brands"),
      ]);

      if (stockRes.ok) setStocks(await stockRes.json());
      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (statsRes.ok) {
        const payload = await statsRes.json();
        setBranchStats(payload.stats);
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (brandsRes.ok) setBrands(await brandsRes.json());
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
          color: formData.color || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Stock created successfully");
      setIsModalOpen(false);
      setFormData({
        name: "",
        categoryId: "",
        brandId: "",
        brand: "",
        size: "",
        color: "",
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

  const openDetails = (stock: Stock) => {
    setActiveStock(stock);
    setIsDetailsModalOpen(true);
  };

  const openEdit = (stock: Stock) => {
    setActiveStock(stock);
    setEditFormData({
      name: stock.name,
      categoryId: stock.categoryId,
      brandId: (stock as any).brandId ?? "",
      brand: stock.brand,
      size: stock.size,
      color: stock.color || "",
      quantity: stock.quantity,
      priceIn: stock.priceIn,
      sellingPrice: stock.sellingPrice,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStock) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/stock/${activeStock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Stock updated successfully");
      setIsEditModalOpen(false);
      setActiveStock(null);
      fetchBranchData();
    } catch (error) {
      toast.error("Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (stock: Stock) => {
    const shouldDelete = window.confirm(`Delete ${stock.brand} ${stock.name} (${stock.size}${stock.color ? `/${stock.color}` : ""})?`);
    if (!shouldDelete) return;
    setIsDeletingId(stock.id);
    try {
      const res = await fetch(`/api/stock/${stock.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Stock deleted successfully");
      fetchBranchData();
    } catch (error) {
      toast.error("Failed to delete stock");
    } finally {
      setIsDeletingId(null);
    }
  };

  const columns = [
    { header: "Barcode", accessorKey: "barcode" as keyof Stock },
    { header: "Product", cell: (s: Stock) => `${s.brand} - ${s.name}` },
    { header: "Category", accessorKey: "category" as keyof Stock },
    { header: "Variant", cell: (s: Stock) => `${s.size}${s.color ? ` / ${s.color}` : ""}` },
    { header: "Qty", accessorKey: "quantity" as keyof Stock },
    { header: "Price", cell: (s: Stock) => `$${s.sellingPrice.toFixed(2)}` },
    {
      header: "Actions",
      cell: (s: Stock) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openDetails(s)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(s)}
            isLoading={isDeletingId === s.id}
            disabled={isDeletingId === s.id}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
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
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Product Name</label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Brand</label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                required
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              >
                <option value="">Select brand...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Category</label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Color (Optional)</label>
              <Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setActiveStock(null);
        }}
        title="Edit Stock Item"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Product Name</label>
              <Input required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Brand</label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                required
                value={editFormData.brandId}
                onChange={(e) => setEditFormData({ ...editFormData, brandId: e.target.value })}
              >
                <option value="">Select brand...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Category</label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                required
                value={editFormData.categoryId}
                onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Color (Optional)</label>
              <Input value={editFormData.color} onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Size</label>
              <Input required value={editFormData.size} onChange={(e) => setEditFormData({ ...editFormData, size: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Quantity</label>
              <Input type="number" min={0} required value={editFormData.quantity} onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Buy Price</label>
              <Input type="number" step="0.01" min={0} required value={editFormData.priceIn} onChange={(e) => setEditFormData({ ...editFormData, priceIn: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Sell Price</label>
              <Input type="number" step="0.01" min={0} required value={editFormData.sellingPrice} onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setActiveStock(null);
        }}
        title="Stock Details"
      >
        {activeStock && (
          <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <div><span className="font-semibold">Barcode:</span> {activeStock.barcode}</div>
            <div><span className="font-semibold">Name:</span> {activeStock.name}</div>
            <div><span className="font-semibold">Brand:</span> {activeStock.brand}</div>
            <div><span className="font-semibold">Category:</span> {activeStock.category}</div>
            <div><span className="font-semibold">Size:</span> {activeStock.size}{activeStock.color ? ` / ${activeStock.color}` : ""}</div>
            <div><span className="font-semibold">Quantity:</span> {activeStock.quantity}</div>
            <div><span className="font-semibold">Buy Price:</span> ${activeStock.priceIn.toFixed(2)}</div>
            <div><span className="font-semibold">Sell Price:</span> ${activeStock.sellingPrice.toFixed(2)}</div>
            <div><span className="font-semibold">Created:</span> {new Date(activeStock.createdAt).toLocaleString()}</div>
            <div><span className="font-semibold">Updated:</span> {new Date(activeStock.updatedAt).toLocaleString()}</div>
          </div>
        )}
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
