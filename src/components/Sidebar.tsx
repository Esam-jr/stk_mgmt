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
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <div className="flex h-screen w-64 flex-col border-r border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-300 px-6 text-sm font-semibold uppercase tracking-wider text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
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
                  ? "bg-zinc-200 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 shrink-0",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-300 p-4 dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between px-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Role: <span className="text-zinc-700 dark:text-zinc-300">{role.replace("_", " ")}</span>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
        >
          <LogOut className="mr-3 h-5 w-5 text-zinc-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
