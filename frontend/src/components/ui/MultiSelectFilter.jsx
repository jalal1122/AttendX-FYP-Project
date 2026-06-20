import { useState, useRef, useEffect } from "react";

/**
 * Reusable MultiSelectFilter Component
 * Dropdown with search, multi-select checkboxes, and tag display.
 *
 * Props:
 *   label: string
 *   options: Array<{ value: string, label: string }>
 *   selected: Array<string>  (array of selected values)
 *   onChange: (selectedValues: string[]) => void
 *   placeholder?: string
 *   searchable?: boolean
 *   className?: string
 */
const MultiSelectFilter = ({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = "Select...",
  searchable = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearch("");
  };

  const selectAll = () => {
    onChange(filteredOptions.map((opt) => opt.value));
  };

  const removeTag = (value, e) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const getSelectedLabels = () => {
    return selected
      .map((val) => options.find((opt) => opt.value === val))
      .filter(Boolean);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[38px] px-3 py-2 border rounded-lg cursor-pointer flex items-center flex-wrap gap-1 transition-colors ${
          isOpen
            ? "border-primary-500 ring-2 ring-primary-200"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          <>
            {getSelectedLabels()
              .slice(0, 3)
              .map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium"
                >
                  {opt.label}
                  <button
                    onClick={(e) => removeTag(opt.value, e)}
                    className="hover:text-primary-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            {selected.length > 3 && (
              <span className="text-xs text-gray-500">
                +{selected.length - 3} more
              </span>
            )}
          </>
        )}
        <span className="ml-auto text-gray-400 text-xs">
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-400"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 px-2 py-1.5 border-b border-gray-100 text-xs">
            <button
              onClick={selectAll}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAll}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear
            </button>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-40">
            {filteredOptions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-3">
                No options found
              </p>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggleOption(opt.value)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
