import { DEPARTMENT_OPTIONS, SEMESTER_OPTIONS, getBatchOptions } from "../../constants/academicOptions";
import Input from "./Input";
import Button from "./Button";

const ClassFilters = ({ filters, setFilters, onFilter, onClear, isAdmin = false }) => {
  const batchOptions = getBatchOptions();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFilters({
      name: "",
      department: "",
      semester: "",
      batch: "",
      ...(isAdmin ? { teacher: "" } : {}),
    });
    if (onClear) onClear();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Filter Classes</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Search Name</label>
          <Input
            name="name"
            value={filters.name || ""}
            onChange={handleInputChange}
            placeholder="Class name..."
            className="w-full text-sm py-2"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
          <select
            name="department"
            value={filters.department || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">All Departments</option>
            {DEPARTMENT_OPTIONS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
          <select
            name="semester"
            value={filters.semester || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">All Semesters</option>
            {SEMESTER_OPTIONS.map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
          <select
            name="batch"
            value={filters.batch || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">All Batches</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Teacher ID</label>
            <Input
              name="teacher"
              value={filters.teacher || ""}
              onChange={handleInputChange}
              placeholder="Teacher Object ID..."
              className="w-full text-sm py-2"
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear Filters
        </Button>
        <Button variant="primary" size="sm" onClick={onFilter}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default ClassFilters;
