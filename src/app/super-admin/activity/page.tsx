"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

const ACTION_LABELS: Record<string, string> = {
  STOCK_CREATE: "Stock added",
  STOCK_UPDATE: "Stock updated",
  STOCK_DELETE: "Stock removed",
  SALE_CREATE: "Sale recorded",
  TRANSFER_CREATE: "Stock transferred",
  CATEGORY_CREATE: "Category added",
  CATEGORY_DELETE: "Category removed",
  BRAND_CREATE: "Brand added",
  BRAND_DELETE: "Brand removed",
};

const ENTITY_LABELS: Record<string, string> = {
  ProductVariant: "Stock item",
  Sale: "Sale",
  StockTransfer: "Transfer",
  Category: "Category",
  Brand: "Brand",
};

function formatMetadata(metadata?: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const entries = Object.entries(metadata);
  return entries.map(([key, value]) => {
    const prettyKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase());
    return `${prettyKey}: ${String(value)}`;
  });
}

export default function ActivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const fetchActivity = async (from?: string, to?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const payload = await res.json();
      setActivities(payload.items ?? []);
    } catch (error) {
      toast.error("Failed to load activity feed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const applyDateFilter = () => {
    fetchActivity(fromDate || undefined, toDate || undefined);
  };

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
    fetchActivity();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Platform Activity</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Global audit feed of user actions across stock, sales, transfers, and catalog changes.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button onClick={applyDateFilter}>Apply Filter</Button>
          <Button variant="secondary" onClick={clearDateFilter}>Clear</Button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="text-zinc-600 dark:text-zinc-400">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-zinc-600 dark:text-zinc-400">No activity logged yet.</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{activity.description}</p>
                  <span className="text-xs text-zinc-500">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {ACTION_LABELS[activity.action] ?? "Activity recorded"} • {ENTITY_LABELS[activity.entityType] ?? activity.entityType}
                  {activity.actor ? ` • ${activity.actor.firstName} ${activity.actor.lastName} (${activity.actor.role})` : " • System"}
                </p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedActivity(activity)}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="Activity Details"
        className="max-w-2xl"
      >
        {selectedActivity && (
          <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <div><span className="font-semibold">Description:</span> {selectedActivity.description}</div>
            <div><span className="font-semibold">Activity type:</span> {ACTION_LABELS[selectedActivity.action] ?? "Activity recorded"}</div>
            <div><span className="font-semibold">Area:</span> {ENTITY_LABELS[selectedActivity.entityType] ?? selectedActivity.entityType}</div>
            <div><span className="font-semibold">Done by:</span> {selectedActivity.actor ? `${selectedActivity.actor.firstName} ${selectedActivity.actor.lastName} (${selectedActivity.actor.role})` : "System"}</div>
            <div><span className="font-semibold">Date & time:</span> {new Date(selectedActivity.createdAt).toLocaleString()}</div>
            <div>
              <span className="font-semibold">What changed:</span>
              {formatMetadata(selectedActivity.metadata).length === 0 ? (
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">No additional details.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {formatMetadata(selectedActivity.metadata).map((item) => (
                    <li key={item} className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
