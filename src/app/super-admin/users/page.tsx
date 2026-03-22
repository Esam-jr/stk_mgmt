"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branch?: { name: string };
};

type Branch = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", role: "SALES", branchId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, bRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/branches")
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (bRes.ok) setBranches(await bRes.json());
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            branchId: formData.branchId || undefined
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("User created successfully");
      setIsModalOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", password: "", role: "SALES", branchId: "" });
      fetchData();
    } catch (e) {
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: "Name", cell: (u: User) => `${u.firstName} ${u.lastName}` },
    { header: "Email", accessorKey: "email" as keyof User },
    { header: "Role", cell: (u: User) => <span className="px-2 py-1 bg-zinc-800 rounded text-xs">{u.role}</span> },
    { header: "Branch", cell: (u: User) => u.branch?.name || "All Branches" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Device Users</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add User</Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={users} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">First Name</label>
              <Input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Last Name</label>
              <Input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email</label>
            <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Password</label>
            <Input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Role</label>
            <select 
              className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={formData.role} 
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="SALES">Sales</option>
              <option value="MAIN_ADMIN">Main Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          
          {(formData.role === "SALES" || formData.role === "MAIN_ADMIN") && (
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Branch Allocation</label>
              <select 
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={formData.branchId} 
                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
              >
                <option value="">Select a branch...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
