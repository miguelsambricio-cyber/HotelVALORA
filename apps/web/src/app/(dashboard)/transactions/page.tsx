import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { TransactionTable } from "@/components/transactions/transaction-table";

export const metadata: Metadata = { title: "Comparable Transactions" };

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Comparable Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sales comps database — CoStar, broker, and manual entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import CoStar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
        </div>
      </div>
      <TransactionTable />
    </div>
  );
}
