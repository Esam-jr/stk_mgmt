"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [salesData, setSalesData] = useState([]);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, stockRes] = await Promise.all([
        fetch("/api/reports/sales"),
        fetch("/api/reports/stock")
      ]);
      
      if (salesRes.ok) setSalesData(await salesRes.json());
      if (stockRes.ok) setStockSummary(await stockRes.json());
    } catch (e) {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-zinc-400">Loading dashbaord...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">Reports Dashboard</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-400 text-sm font-medium">Total Inventory Value</h3>
          <p className="text-2xl font-bold text-white mt-2">${stockSummary?.inventoryValue?.toFixed(2) || "0.00"}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-400 text-sm font-medium">Potential Revenue</h3>
          <p className="text-2xl font-bold text-white mt-2">${stockSummary?.potentialRevenue?.toFixed(2) || "0.00"}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-zinc-400 text-sm font-medium">Low Stock Alerts</h3>
          <p className="text-2xl font-bold text-red-500 mt-2">{stockSummary?.lowStockCount || 0} Items</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hidden md:block">
        <h3 className="text-white font-semibold mb-6">Revenue & Profit (Last 30 Days)</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#818cf8" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#34d399" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
