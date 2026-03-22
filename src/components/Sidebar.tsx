"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Building2, 
  ArrowRightLeft, 
  BarChart3, 
  Package, 
  ShoppingCart,
  LogOut,
  Boxes
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const superAdminNav: SidebarItem[] = [
  { name: "Users", href: "/super-admin/users", icon: Users },
  { name: "Branches", href: "/super-admin/branches", icon: Building2 },
  { name: "Transfer", href: "/super-admin/transfer", icon: ArrowRightLeft },
  { name: "Reports", href: "/super-admin/reports", icon: BarChart3 },
];

const mainAdminNav: SidebarItem[] = [
  { name: "Stock", href: "/main-admin/stock", icon: Package },
  { name: "Transfer", href: "/main-admin/transfer", icon: ArrowRightLeft },
  { name: "Reports", href: "/main-admin/reports", icon: BarChart3 },
];

const salesNav: SidebarItem[] = [
  { name: "Point of Sale", href: "/sales", icon: ShoppingCart },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  let navItems: SidebarItem[] = [];
  let prefix = "";

  if (role === "SUPER_ADMIN") {
    navItems = superAdminNav;
    prefix = "/super-admin";
  } else if (role === "MAIN_ADMIN") {
    navItems = mainAdminNav;
    prefix = "/main-admin";
  } else if (role === "SALES") {
    navItems = salesNav;
    prefix = "/sales";
  }

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login"); // redirect to login page
        },
      },
    });
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-zinc-900 border-r border-zinc-800 text-zinc-300">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6 font-semibold text-zinc-100 uppercase tracking-wider text-sm">
        <Boxes className="h-5 w-5 text-indigo-500" />
        Stock Mgmt
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-zinc-800 text-indigo-400" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
              )}
            >
              <item.icon className={cn(
                "mr-3 flex-shrink-0 h-5 w-5",
                isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="mb-4 px-2 text-xs uppercase text-zinc-500 tracking-wider font-semibold">
          Role: <span className="text-zinc-300">{role.replace("_", " ")}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-zinc-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
