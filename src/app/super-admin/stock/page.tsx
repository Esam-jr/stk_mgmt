"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Building2, MapPin, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

type Branch = { id: string; name: string; location?: string | null };
type Category = { id: string; name: string };
type Brand = { id: string; name: string };

export default function StockPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [branchFormData, setBranchFormData] = useState({ name: "", location: "" });

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchCatalog();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed");
      setBranches(await res.json());
    } catch (error) {
      toast.error("Failed to load branches");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const [cRes, bRes] = await Promise.all([fetch("/api/categories"), fetch("/api/brands")]);
      if (cRes.ok) setCategories(await cRes.json());
      if (bRes.ok) setBrands(await bRes.json());
    } catch (error) {
      toast.error("Failed to load catalog");
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSubmittingCatalog(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewCategoryName("");
      fetchCatalog();
      toast.success("Category added");
    } catch {
      toast.error("Failed to add category");
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const deleteCategory = async (id: string) => {
    setIsSubmittingCatalog(true);
    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchCatalog();
      toast.success("Category removed");
    } catch {
      toast.error("Failed to remove category");
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsSubmittingCatalog(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewBrandName("");
      fetchCatalog();
      toast.success("Brand added");
    } catch {
      toast.error("Failed to add brand");
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const deleteBrand = async (id: string) => {
    setIsSubmittingCatalog(true);
    try {
      const res = await fetch(`/api/brands?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchCatalog();
      toast.success("Brand removed");
    } catch {
      toast.error("Failed to remove brand");
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBranch(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchFormData),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Branch created successfully");
      setIsAddBranchModalOpen(false);
      setBranchFormData({ name: "", location: "" });
      fetchBranches();
    } catch (error) {
      toast.error("Failed to create branch");
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-zinc-100 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <Building2 className="h-6 w-6 text-indigo-500" />
              Branch Stock Management
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage branch inventory and add new branches from one workspace.
            </p>
          </div>
          <Button onClick={() => setIsAddBranchModalOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Branch
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setIsCatalogModalOpen(true)}>
            Manage Categories & Brands
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Branches</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{branches.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-zinc-500">With Location Data</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {branches.filter((branch) => !!branch.location).length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : branches.length === 0 ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No branches available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-lg border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{branch.name}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {branch.location || "No location provided"}
              </p>
              <Link href={`/super-admin/stock/${branch.id}`} className="mt-4 inline-block">
                <Button>Manage Branch</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isAddBranchModalOpen} onClose={() => setIsAddBranchModalOpen(false)} title="Create New Branch">
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Branch Name</label>
            <Input
              required
              value={branchFormData.name}
              onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              Location / Address
            </label>
            <Input
              required
              value={branchFormData.location}
              onChange={(e) => setBranchFormData({ ...branchFormData, location: e.target.value })}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmittingBranch}>
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} title="Catalog Settings">
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Categories</h3>
            <div className="flex gap-2">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" />
              <Button onClick={addCategory} isLoading={isSubmittingCatalog} disabled={!newCategoryName.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => deleteCategory(c.id)}
                  disabled={isSubmittingCatalog}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  title="Click to remove"
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">Tip: categories in use cannot be deleted.</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Brands</h3>
            <div className="flex gap-2">
              <Input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="New brand name" />
              <Button onClick={addBrand} isLoading={isSubmittingCatalog} disabled={!newBrandName.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => deleteBrand(b.id)}
                  disabled={isSubmittingCatalog}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  title="Click to remove"
                >
                  {b.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">Tip: brands in use cannot be deleted.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
