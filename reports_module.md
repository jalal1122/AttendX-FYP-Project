# Reports Module Architecture

The Analytics & Reports Module in AttendX utilizes an advanced "Omni-Controller" architecture. Rather than duplicating logic for Admins, Teachers, and Students, the backend natively filters a single set of powerful aggregation pipelines based on the requesting user's role.

## Architecture & Scoping
The core engine resides in `src/controllers/adminReports.controller.js`. When a request hits any of the `/api/v1/analytics/admin/*` endpoints, the controller applies strict data isolation:

- **Admin (`admin`)**: Receives unfiltered, system-wide aggregations.
- **Teacher (`teacher`)**: The controller automatically injects `classFilter.teacher = req.user._id`, mathematically isolating all calculations to only the classes the teacher is assigned to.
- **Student (`student`)**: The controller injects `classFilter.students = req.user._id` to find enrolled classes, AND modifies the pipeline match stage to `attendanceMatch.studentId = req.user._id`. This guarantees the `$sum` operations only count their personal `Present/Absent` records.

## Available Reports & Dashboards

The frontend features three distinct UI dashboards powered by the exact same API: `AdminReports.jsx`, `TeacherReports.jsx`, and `StudentReports.jsx`. 

### 1. Classes Report
- **Endpoint**: `/admin/classes`
- **Access**: Admin, Teacher, Student
- **Data Yield**: Total Students, Total Sessions, and Avg Attendance % per class.
- **UI Tab**: Available to all roles.

### 2. Subjects Report
- **Endpoint**: `/admin/subjects`
- **Access**: Admin, Teacher, Student
- **Data Yield**: Aggregates attendance across identical subjects (e.g., merging "Data Structures Section A" and "Data Structures Section B").
- **UI Tab**: Available to Teachers and Students.

### 3. Semesters Report
- **Endpoint**: `/admin/semesters`
- **Access**: Admin, Teacher, Student
- **Data Yield**: Aggregates attendance vertically across entire semesters.
- **UI Tab**: Available to Teachers and Students.

### 4. Departments & Batches Report
- **Endpoint**: `/admin/departments`, `/admin/batches`
- **Access**: Admin, Teacher
- **Data Yield**: Macro-level aggregations across entire departments and yearly batches.
- **UI Tab**: Available to Teachers. Admin utilizes these endpoints primarily for populating multi-select dropdown filters.

### 5. Students & Defaulters Report
- **Endpoint**: `/admin/students`, `/admin/defaulters`
- **Access**: Admin, Teacher
- **Data Yield**: Drill-down statistics per individual student. Defaulters report heavily filters for `attendancePercentage < threshold` (default 75%).
- **UI Tab**: Available to Admin and Teacher. Includes direct drill-down modals to view specific session dates.

### 6. Teachers Report
- **Endpoint**: `/admin/teachers`
- **Access**: Admin Only
- **Data Yield**: Evaluates teacher performance, tracking how many classes they manage and the overall attendance health of their classes.

## Features
- **Data Tables**: Paginated, highly optimized UI components.
- **Dynamic Filtering**: Server-side filtering by Date Range, Department, Batch, Semester, and Section.
- **Excel Exports**: Integrated with `ExcelJS`. Hitting the endpoint with `?export=true` returns a formatted `.xlsx` binary blob, mapped correctly to the user's isolated scope.
