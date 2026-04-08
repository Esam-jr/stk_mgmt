import React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-zinc-300 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900/50", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
          <thead className="bg-zinc-200 text-xs uppercase text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 font-medium tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-zinc-500">
                  No data available.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="border-b border-zinc-300/70 transition-colors hover:bg-zinc-100 last:border-0 dark:border-zinc-800/60 dark:hover:bg-zinc-800/30"
                >
                  {columns.map((col, j) => (
                    <td key={j} className="whitespace-nowrap px-6 py-4">
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
