"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

type Transfer = {
  id: string;
  stock: { category: string; brand: string; size: string };
  fromBranch: { name: string };
  toBranch: { name: string };
  quantity: number;
  transferredBy: { firstName: string; lastName: string };
  createdAt: string;
};

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Future state: To add new transfers, we would fetch stock items and branches here.
  // For brevity and scope, this simply lists the transfers. Adding them is similar to users/branches.

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/transfer");
      if (res.ok) setTransfers(await res.json());
    } catch (e) {
      toast.error("Failed to load transfers");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { header: "Date", cell: (t: Transfer) => new Date(t.createdAt).toLocaleDateString() },
    { header: "Item", cell: (t: Transfer) => `${t.stock.brand} - ${t.stock.category} (${t.stock.size})` },
    { header: "From", cell: (t: Transfer) => t.fromBranch.name },
    { header: "To", cell: (t: Transfer) => t.toBranch.name },
    { header: "Quantity", accessorKey: "quantity" as keyof Transfer },
    { header: "Transferred By", cell: (t: Transfer) => `${t.transferredBy.firstName} ${t.transferredBy.lastName}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Stock Transfers</h1>
        <Button>Initiate Transfer</Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={transfers} />
      )}
    </div>
  );
}
