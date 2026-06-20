import { useState, useMemo } from "react";

/**
 * Reusable SortableTable Component
 * Supports click-to-sort on column headers (ascending/descending toggle).
 *
 * Props:
 *   columns: Array<{ key: string, label: string, sortable?: boolean, render?: (value, row) => ReactNode }>
 *   data: Array<Object>
 *   onRowClick?: (row) => void
 *   emptyMessage?: string
 *   className?: string
 *   stickyHeader?: boolean
 */
const SortableTable = ({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = "No data available",
  className = "",
  stickyHeader = false,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key, sortable) => {
    if (sortable === false) return;

    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Numeric comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const getSortIcon = (key, sortable) => {
    if (sortable === false) return null;

    if (sortConfig.key !== key) {
      return (
        <span className="ml-1 text-gray-300 group-hover:text-gray-400">
          ↕
        </span>
      );
    }
    return (
      <span className="ml-1 text-primary-600">
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  if (data.length === 0) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <p className="text-center text-gray-500 py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={`bg-gray-50 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key, col.sortable)}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none ${
                  col.sortable !== false
                    ? "cursor-pointer hover:bg-gray-100 group transition-colors"
                    : ""
                }`}
              >
                <div className="flex items-center">
                  {col.label}
                  {getSortIcon(col.key, col.sortable)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row._id || row.id || rowIndex}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-gray-50 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SortableTable;
