"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Building2, MapPin, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

type Branch = { id: string; name: string; location: string };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ name: "", location: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) setBranches(await res.json());
    } catch (e) {
      toast.error("Failed to load branches");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Branch created successfully");
      setIsModalOpen(false);
      setFormData({ name: "", location: "" });
      fetchData();
    } catch (e) {
      toast.error("Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Branch Name", accessorKey: "name" as keyof Branch },
    { header: "Location", cell: (b: Branch) => b.location || "Not specified" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-zinc-100 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <Building2 className="h-6 w-6 text-indigo-500" />
              Branch Management
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configure branch locations and keep your structure organized.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
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
            {branches.filter((b) => !!b.location).length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={branches} className="rounded-xl shadow-sm" />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Branch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Branch Name</label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              Location / Address
            </label>
            <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Create Branch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
