"use client";

import { useState, useCallback } from "react";

import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";
import { AdminBulkActionBar, type BulkAction } from "@/components/admin/AdminBulkActionBar";

interface AdminBulkTableWrapperProps {
  action: (formData: FormData) => void;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  emptyMessage: string;
  bulkActions: BulkAction[];
}

export function AdminBulkTableWrapper({
  action,
  columns,
  rows,
  emptyMessage,
  bulkActions,
}: AdminBulkTableWrapperProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleClear = useCallback(() => setSelected(new Set()), []);

  return (
    <form action={action}>
      <input type="hidden" name="ids" value={Array.from(selected).join(",")} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
      />
      <AdminBulkActionBar
        count={selected.size}
        actions={bulkActions}
        onClear={handleClear}
      />
    </form>
  );
}
