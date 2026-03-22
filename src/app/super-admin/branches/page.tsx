"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
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
    { header: "Location", accessorKey: "location" as keyof Branch },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Branch Management</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Branch</Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={branches} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Branch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Branch Name</label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Location / Address</label>
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
