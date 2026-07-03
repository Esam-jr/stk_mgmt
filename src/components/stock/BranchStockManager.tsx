"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Download, Eye, Pencil, Tags, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";

type Stock = {
  id: string;
  productId: string;
  name: string;
  category: string;
  categoryId: string;
  brand: string;
  brandId: string;
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
type CatalogItem = Category | Brand;
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

type ExcelRow = Record<string, string | number | boolean | null | undefined>;

type BranchStockManagerProps = {
  backHref: string;
  canManageCatalog?: boolean;
};

const emptyStockForm = {
  name: "",
  categoryId: "",
  brandId: "",
  brand: "",
  size: "",
  color: "",
  quantity: 0,
  priceIn: 0,
  sellingPrice: 0,
};

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function readCell(row: ExcelRow, names: string[]) {
  const entries = Object.entries(row);
  for (const name of names) {
    const found = entries.find(([key]) => normalizeKey(key) === normalizeKey(name));
    if (found) return normalize(found[1]);
  }
  return "";
}

function findCatalogId(items: CatalogItem[], value: string) {
  const normalized = normalizeKey(value);
  return items.find((item) => item.id === value || normalizeKey(item.name) === normalized)?.id ?? "";
}

function hasValidPricePair(formData: { priceIn: number; sellingPrice: number }) {
  return formData.sellingPrice > formData.priceIn;
}

export function BranchStockManager({ backHref, canManageCatalog = false }: BranchStockManagerProps) {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeStock, setActiveStock] = useState<Stock | null>(null);
  const [branchStats, setBranchStats] = useState<BranchStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [catalogActionId, setCatalogActionId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyStockForm);
  const [editFormData, setEditFormData] = useState(emptyStockForm);

  const currentBranch = useMemo(
    () => branches.find((branch) => branch.id === branchId),
    [branches, branchId]
  );

  const filteredStocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stocks.filter((stock) => {
      const matchesQuery =
        query.length === 0 ||
        stock.name.toLowerCase().includes(query) ||
        stock.brand.toLowerCase().includes(query) ||
        stock.category.toLowerCase().includes(query) ||
        stock.barcode.toLowerCase().includes(query) ||
        stock.size.toLowerCase().includes(query) ||
        (stock.color ?? "").toLowerCase().includes(query);
      const matchesLowStock = !showLowStockOnly || stock.quantity < 10;
      return matchesQuery && matchesLowStock;
    });
  }, [stocks, searchQuery, showLowStockOnly]);

  const fetchBranchData = useCallback(async () => {
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
    } catch {
      toast.error("Failed to load branch stock");
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    // Existing pages fetch their client-side dashboard data on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBranchData();
  }, [branchId, fetchBranchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidPricePair(formData)) {
      toast.error("Sell price must be higher than buy price");
      return;
    }
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
      setFormData(emptyStockForm);
      fetchBranchData();
    } catch {
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
      brandId: stock.brandId,
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
    if (!hasValidPricePair(editFormData)) {
      toast.error("Sell price must be higher than buy price");
      return;
    }
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
    } catch {
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
    } catch {
      toast.error("Failed to delete stock");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = stocks.map((stock) => ({
        Code: stock.barcode,
        "Product Name": stock.name,
        Brand: stock.brand,
        Category: stock.category,
        Size: stock.size,
        Color: stock.color ?? "",
        Quantity: stock.quantity,
        "Buy Price": stock.priceIn,
        "Sell Price": stock.sellingPrice,
        Branch: stock.branch.name,
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Stock");
      XLSX.writeFile(workbook, `${currentBranch?.name ?? "branch"}-stock.xlsx`);
    } catch {
      toast.error("Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("The selected Excel file has no stock rows");
        return;
      }

      type ImportItem = {
        rowNumber: number;
        name: string; brandValue: string; brandId: string;
        categoryValue: string; categoryId: string;
        size: string; color: string | null;
        quantity: number; priceIn: number; sellingPrice: number;
        barcode: string | null; branchId: string;
      };
      const items: ImportItem[] = rows.map((row, index) => {
        const brandValue = readCell(row, ["Brand ID", "Brand"]);
        const categoryValue = readCell(row, ["Category ID", "Category"]);
        return {
          rowNumber: index + 2,
          name: readCell(row, ["Product Name", "Product", "Name"]),
          brandValue,
          brandId: findCatalogId(brands, brandValue),
          categoryValue,
          categoryId: findCatalogId(categories, categoryValue),
          size: readCell(row, ["Size"]),
          color: readCell(row, ["Color"]) || null,
          quantity: Number(readCell(row, ["Quantity", "Qty"])),
          priceIn: Number(readCell(row, ["Buy Price", "Price In", "Cost"])),
          sellingPrice: Number(readCell(row, ["Sell Price", "Selling Price", "Price"])),
          barcode: readCell(row, ["Code", "Barcode"]) || null,
          branchId,
        };
      });

      const invalidRows = items.map((item) => {
        const issues: string[] = [];
        if (!item.name) issues.push("empty name");
        if (!item.brandId) issues.push(`brand "${item.brandValue}" not found`);
        if (!item.categoryId) issues.push(`category "${item.categoryValue}" not found`);
        if (!item.size) issues.push("empty size");
        if (Number.isNaN(item.quantity)) issues.push("invalid quantity");
        if (Number.isNaN(item.priceIn)) issues.push("invalid buy price");
        if (Number.isNaN(item.sellingPrice)) issues.push("invalid sell price");
        if (item.sellingPrice <= item.priceIn) issues.push("sell price must be > buy price");
        return { row: item.rowNumber, issues };
      }).filter((r) => r.issues.length > 0);

      if (invalidRows.length > 0) {
        const first = invalidRows[0];
        toast.error(`Row ${first.row}: ${first.issues.join(", ")}`);
        return;
      }

      const res = await fetch("/api/stock/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`${res.status}: ${errBody.slice(0, 300)}`);
      }
      const result = await res.json();
      toast.success(`Imported ${result.created} new and updated ${result.updated} existing stock rows`);
      fetchBranchData();
    } catch (err) {
      toast.error(`Import failed — ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateCatalogItem = async (type: "category" | "brand") => {
    const name = type === "category" ? newCategoryName.trim() : newBrandName.trim();
    if (!name) return;

    setCatalogActionId(`${type}:create`);
    try {
      const res = await fetch(`/api/${type === "category" ? "categories" : "brands"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${type === "category" ? "Category" : "Brand"} created`);
      if (type === "category") setNewCategoryName("");
      if (type === "brand") setNewBrandName("");
      fetchBranchData();
    } catch {
      toast.error(`Failed to create ${type}`);
    } finally {
      setCatalogActionId(null);
    }
  };

  const handleDeleteCatalogItem = async (type: "category" | "brand", item: CatalogItem) => {
    const shouldDelete = window.confirm(`Delete ${item.name}?`);
    if (!shouldDelete) return;

    setCatalogActionId(`${type}:${item.id}`);
    try {
      const res = await fetch(`/api/${type === "category" ? "categories" : "brands"}?id=${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${type === "category" ? "Category" : "Brand"} deleted`);
      fetchBranchData();
    } catch {
      toast.error(`${type === "category" ? "Category" : "Brand"} is in use or could not be deleted`);
    } finally {
      setCatalogActionId(null);
    }
  };

  const columns = [
    { header: "Code", accessorKey: "barcode" as keyof Stock },
    { header: "Product", cell: (s: Stock) => `${s.brand} - ${s.name}` },
    { header: "Category", accessorKey: "category" as keyof Stock },
    { header: "Variant", cell: (s: Stock) => `${s.size}${s.color ? ` / ${s.color}` : ""}` },
    { header: "Qty", accessorKey: "quantity" as keyof Stock },
    {
      header: "Status",
      cell: (s: Stock) =>
        s.quantity < 10 ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            Low Stock
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            Healthy
          </span>
        ),
    },
    { header: "Price", cell: (s: Stock) => `$${s.sellingPrice.toFixed(2)}` },
    {
      header: "Actions",
      cell: (s: Stock) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openDetails(s)} title="View details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit stock">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(s)}
            isLoading={isDeletingId === s.id}
            disabled={isDeletingId === s.id}
            title="Delete stock"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {currentBranch ? `${currentBranch.name} Stock` : "Branch Stock"}
          </h1>
          <Link href={backHref} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Back to branches
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} isLoading={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isImporting}>
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          {canManageCatalog && (
            <Button variant="secondary" onClick={() => setIsCatalogModalOpen(true)}>
              <Tags className="mr-2 h-4 w-4" />
              Manage Categories & Brands
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>Add Stock</Button>
        </div>
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
          <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Search Stock</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code, product, brand, category, size..."
                />
              </div>
              <Button
                type="button"
                variant={showLowStockOnly ? "secondary" : "ghost"}
                onClick={() => setShowLowStockOnly((prev) => !prev)}
              >
                {showLowStockOnly ? "Showing Low Stock" : "Show Low Stock Only"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Displaying {filteredStocks.length} of {stocks.length} stock variants.
            </p>
          </div>
          <DataTable columns={columns} data={filteredStocks} />
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Stock Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-zinc-500">Stock code is auto-generated as a unique 3-digit number.</p>
          <StockFormFields
            formData={formData}
            setFormData={setFormData}
            brands={brands}
            categories={categories}
          />
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!hasValidPricePair(formData)}>
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
          <StockFormFields
            formData={editFormData}
            setFormData={setEditFormData}
            brands={brands}
            categories={categories}
          />
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!hasValidPricePair(editFormData)}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        title="Manage Categories & Brands"
        className="max-w-3xl"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <CatalogManager
            title="Categories"
            items={categories}
            value={newCategoryName}
            onChange={setNewCategoryName}
            onCreate={() => handleCreateCatalogItem("category")}
            onDelete={(item) => handleDeleteCatalogItem("category", item)}
            actionIdPrefix="category"
            activeActionId={catalogActionId}
          />
          <CatalogManager
            title="Brands"
            items={brands}
            value={newBrandName}
            onChange={setNewBrandName}
            onCreate={() => handleCreateCatalogItem("brand")}
            onDelete={(item) => handleDeleteCatalogItem("brand", item)}
            actionIdPrefix="brand"
            activeActionId={catalogActionId}
          />
        </div>
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
            <div><span className="font-semibold">Stock Code:</span> {activeStock.barcode}</div>
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

function StockFormFields({
  formData,
  setFormData,
  brands,
  categories,
}: {
  formData: typeof emptyStockForm;
  setFormData: React.Dispatch<React.SetStateAction<typeof emptyStockForm>>;
  brands: Brand[];
  categories: Category[];
}) {
  return (
    <>
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
      {!hasValidPricePair(formData) && formData.priceIn > 0 && formData.sellingPrice > 0 && (
        <p className="text-xs text-red-500">Sell price must be higher than buy price.</p>
      )}
    </>
  );
}

function CatalogManager({
  title,
  items,
  value,
  onChange,
  onCreate,
  onDelete,
  actionIdPrefix,
  activeActionId,
}: {
  title: string;
  items: CatalogItem[];
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (item: CatalogItem) => void;
  actionIdPrefix: "category" | "brand";
  activeActionId: string | null;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`New ${title.toLowerCase().slice(0, -1)}`} />
        <Button
          type="button"
          onClick={onCreate}
          disabled={!value.trim()}
          isLoading={activeActionId === `${actionIdPrefix}:create`}
        >
          Add
        </Button>
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <span className="truncate text-zinc-800 dark:text-zinc-200">{item.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item)}
              isLoading={activeActionId === `${actionIdPrefix}:${item.id}`}
              title={`Delete ${item.name}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-2 py-3 text-sm text-zinc-500">No records yet.</p>
        )}
      </div>
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
