import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.js";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  sortable?: boolean | undefined;
}

export interface DataTableProps<T> extends HTMLAttributes<HTMLDivElement> {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number | undefined;
  emptyText?: ReactNode | undefined;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 5,
  emptyText = "No records found.",
  className,
  ...props
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    const comparison = aVal > bVal ? 1 : -1;
    return sortDir === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={cn("metron-data-table", className)} {...props}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={col.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                  <span>{col.header}</span>
                  {col.sortable && sortKey === col.key && (
                    <span aria-hidden="true" style={{ opacity: 0.8 }}>
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} style={{ textAlign: "center", padding: "2rem" }}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => (
              <TableRow key={index}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0.25rem",
            fontSize: "0.85rem",
            color: "var(--metron-pearl-muted)",
          }}
        >
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="metron-button metron-button--glass metron-button--sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="metron-button metron-button--glass metron-button--sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DataTableColumnHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { title: string }
>(({ title, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("metron-data-table-column-header", className)}
    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
    {...props}
  >
    <span>{title}</span>
    {children}
  </div>
));
DataTableColumnHeader.displayName = "DataTableColumnHeader";
