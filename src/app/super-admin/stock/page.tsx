"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Building2, MapPin, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

type Branch = { id: string; name: string; location?: string | null };

export default function StockPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [branchFormData, setBranchFormData] = useState({ name: "", location: "" });

  useEffect(() => {
    fetchBranches();
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
    </div>
  );
}
