"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push("/login");
      } else {
        const role = (session.user as { role?: string }).role;
        if (role === "SUPER_ADMIN") router.push("/super-admin/users");
        else if (role === "MAIN_ADMIN") router.push("/main-admin/stock");
        else if (role === "SALES") router.push("/sales");
        else router.push("/login"); // fallback
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm">Authenticating session...</p>
      </div>
    </div>
  );
}
