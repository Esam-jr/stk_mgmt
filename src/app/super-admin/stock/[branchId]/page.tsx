import { BranchStockManager } from "@/components/stock/BranchStockManager";

export default function BranchStockPage() {
  return <BranchStockManager backHref="/super-admin/stock" canManageCatalog />;
}
