import { SalesHistoryManager } from "@/components/sales/SalesHistoryManager";

export default function MainAdminSalesHistoryPage() {
  return (
    <SalesHistoryManager
      showBranchFilter
      description="Review sales across branches, filter by branch, and search transaction history."
    />
  );
}
