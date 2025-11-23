# Phase 7 Implementation - Remaining Frontend Changes

## Changes Needed:

### 1. LiveSession.jsx - Add Geolocation

- Capture teacher's location when starting session
- Use `navigator.geolocation.getCurrentPosition()`
- Send latitude, longitude to `/session/start` API

### 2. ScanAttendance.jsx - Add Geolocation

- Capture student's location before scanning
- Send latitude, longitude with attendance mark API
- Handle geofencing errors gracefully

### 3. Reports.jsx - Add Date Filters & Excel Export

- Add date range picker (start/end date inputs)
- Add preset buttons ("This Week", "This Month", "This Semester")
- Add "Export CSV" and "Export Excel" buttons
- Use `xlsx` library to export data
- Pass startDate/endDate to analytics API

### 4. Update analyticsAPI.js

- Modify `getClassAnalytics` to accept startDate/endDate params
- Add query parameters to API call

## Implementation Code Snippets:

### For LiveSession.jsx (add to startSession function):

```javascript
// Get teacher's location
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Include in API call
    sessionAPI.startSession(classId, { latitude, longitude, type });
  },
  (error) => {
    console.warn("Location access denied:", error);
    // Start session without location
    sessionAPI.startSession(classId, { type });
  }
);
```

### For ScanAttendance.jsx (add to handleScan):

```javascript
navigator.geolocation.getCurrentPosition(
  async (position) => {
    const { latitude, longitude } = position.coords;
    await attendanceAPI.markAttendance(token, latitude, longitude);
  },
  (error) => {
    setMessage({ type: "error", text: "Location access is required" });
  }
);
```

### For Reports.jsx Date Filters:

```javascript
const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

const presets = {
  thisWeek: () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    };
  },
  thisMonth: () => {
    const start = new Date();
    start.setDate(1);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    };
  },
};
```

### For Excel Export (Reports.jsx):

```javascript
import * as XLSX from "xlsx";

const exportToExcel = () => {
  const data = students.map((s) => ({
    "Student Name": s.name,
    "Roll No": s.info?.rollNo,
    "Total Classes": s.totalClasses,
    Present: s.presentCount,
    Absent: s.absentCount,
    Percentage: s.percentage.toFixed(2) + "%",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  XLSX.writeFile(wb, `attendance-report-${Date.now()}.xlsx`);
};

const exportToCSV = () => {
  // Similar to Excel but use XLSX.utils.sheet_to_csv()
};
```

## Backend Already Completed:

✅ Session model updated with location field
✅ Session controller accepts latitude/longitude
✅ Attendance controller validates geofencing
✅ Haversine formula utility created
✅ User model has avatar field
✅ Cloudinary upload configured
✅ Multer middleware created
✅ Analytics controller supports date filters
✅ Create user endpoint added

## Testing Checklist:

1. Test geofencing on same WiFi (should work)
2. Test profile picture upload
3. Test Excel/CSV export
4. Test date filtering in reports
5. Test admin user creation
