"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;

};

type Branch = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
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

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "", // empty means leave unchanged
      role: user.role,
      branchId: user.branch?.id || "" // wait, branch is not guaranteed to have id in type if we don't fetch it, let's fix type
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("User deleted successfully");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete user");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEditing = !!editingUserId;
      const url = isEditing ? `/api/users/${editingUserId}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            branchId: formData.role === "SALES" ? formData.branchId || undefined : undefined
        }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      toast.success(isEditing ? "User updated successfully" : "User created successfully");
      closeModal();
      fetchData();
    } catch (e) {
      toast.error(editingUserId ? "Failed to update user" : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData({ firstName: "", lastName: "", email: "", password: "", role: "SALES", branchId: "" });
  };

  const columns = [
    { header: "Name", cell: (u: User) => `${u.firstName} ${u.lastName}` },
    { header: "Email", accessorKey: "email" as keyof User },
    { header: "Role", cell: (u: User) => <span className="px-2 py-1 bg-zinc-800 rounded text-xs">{u.role}</span> },
    { header: "Branch", cell: (u: User) => u.branch?.name || "All Branches" },
    {
      header: "Actions",
      cell: (u: User) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
            <Edit2 className="w-4 h-4 text-zinc-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} isLoading={isDeletingId === u.id}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      )
    }
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUserId ? "Edit User" : "Create New User"}>
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
            <label className="text-sm text-zinc-400 mb-1 block">Password {editingUserId && "(Leave empty to keep)"}</label>
            <Input type="password" required={!editingUserId} minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
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
          
          {formData.role === "SALES" && (
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
            <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingUserId ? "Save Changes" : "Create User"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
