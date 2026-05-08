"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

export default function ActivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/activity?limit=200");
        if (!res.ok) throw new Error("Failed");
        const payload = await res.json();
        setActivities(payload.items ?? []);
      } catch (error) {
        toast.error("Failed to load activity feed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Platform Activity</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Global audit feed of user actions across stock, sales, transfers, and catalog changes.
        </p>
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
                  {activity.action} • {activity.entityType}
                  {activity.actor ? ` • ${activity.actor.firstName} ${activity.actor.lastName} (${activity.actor.role})` : " • System"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
