import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Reports from "../pages/common/Reports";
import { renderWithProviders } from "./utils/test-utils.jsx";
import analyticsAPI from "../services/analyticsAPI";
import classAPI from "../services/classAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/analyticsAPI", () => ({
  default: {
    getClassAnalytics: vi.fn(),
    getDefaulters: vi.fn(),
    getDetailedAttendance: vi.fn(),
  },
}));

vi.mock("../services/classAPI", () => ({
  default: {
    getClassDetails: vi.fn(),
  },
}));

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockGetClassAnalytics = vi.mocked(analyticsAPI.getClassAnalytics);
const mockGetDefaulters = vi.mocked(analyticsAPI.getDefaulters);
const mockGetDetailedAttendance = vi.mocked(analyticsAPI.getDetailedAttendance);
const mockGetClassDetails = vi.mocked(classAPI.getClassDetails);

describe("Reports", () => {
  const classId = "class-1";

  const classData = {
    name: "Computer Networks",
    code: "CN501",
    section: "A",
    department: "CSE",
    semester: "5",
    batch: "2021-2025",
    academicYear: "2025-2026",
    room: "R-12",
    teacher: {
      name: "Dr. Ada Lovelace",
      email: "ada@example.com",
    },
  };

  const analytics = {
    class: {
      teacher: {
        name: "Dr. Ada Lovelace",
        email: "ada@example.com",
      },
    },
    totalSessions: 95,
    overallStats: {
      totalPresent: 80,
      totalAbsent: 10,
      totalLate: 5,
    },
    trends: [
      { _id: 1, present: 40, absent: 5, late: 2 },
      { _id: 2, present: 40, absent: 5, late: 3 },
    ],
  };

  const defaulters = [
    {
      studentId: "student-1",
      name: "Bob Smith",
      info: { rollNo: "S-1009" },
      attendancePercentage: 70.4,
      presentCount: 7,
      totalClasses: 10,
    },
  ];

  const detailedAttendance = {
    attendance: [
      {
        studentName: "Bob Smith",
        rollNo: "S-1009",
        sessions: [{ status: "Present" }, { status: "Absent" }],
      },
    ],
    sessions: [
      { date: "2026-05-01T10:00:00.000Z", type: "Lecture" },
      { date: "2026-05-08T10:00:00.000Z", type: "Lecture" },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    mockGetClassAnalytics.mockReset();
    mockGetDefaulters.mockReset();
    mockGetDetailedAttendance.mockReset();
    mockGetClassDetails.mockReset();
    vi.useRealTimers();

    mockGetClassDetails.mockResolvedValue({ data: classData });
    mockGetClassAnalytics.mockResolvedValue({ data: analytics });
    mockGetDefaulters.mockResolvedValue({ data: { defaulters } });
    mockGetDetailedAttendance.mockResolvedValue({ data: detailedAttendance });

    vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:reports-url");
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  const renderReports = () =>
    renderWithProviders(
      <Routes>
        <Route path="/teacher/class/:classId/reports" element={<Reports />} />
      </Routes>,
      { initialEntries: [`/teacher/class/${classId}/reports`] },
    );

  it("renders the analytics dashboard and fetched summary data", async () => {
    const { container } = renderReports();

    expect(screen.getByText(/loading analytics/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /class analytics/i }),
    ).toBeVisible();
    expect(screen.getByText(/computer networks/i)).toBeVisible();
    expect(screen.getByText(/cn501/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /back to class/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /this week/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /this month/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /this semester/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /export excel/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeVisible();

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0]).toBeTruthy();
    expect(dateInputs[1]).toBeTruthy();

    expect(
      screen.getByText("Attendance Rate", { selector: "h3" }).parentElement,
    ).toHaveTextContent("84%");
    expect(screen.getByText(/total present/i).parentElement).toHaveTextContent(
      "80",
    );
    expect(screen.getByText(/total absent/i).parentElement).toHaveTextContent(
      "10",
    );
    expect(screen.getByText(/total late/i).parentElement).toHaveTextContent(
      "5",
    );
    expect(
      screen.getByText("Students Below 75% Attendance", { selector: "h2" }),
    ).toBeVisible();
    expect(screen.getByText(/bob smith/i)).toBeVisible();
    expect(screen.getByText("S-1009")).toBeVisible();
    expect(screen.getByText("70.4%")).toBeVisible();
    expect(screen.getByText("7/10")).toBeVisible();

    expect(
      screen.getAllByTestId("responsive-container").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("pie-chart")).toBeVisible();
    expect(screen.getByTestId("bar-chart")).toBeVisible();
  });

  it("shows an error state when analytics loading fails and navigates back", async () => {
    const user = userEvent.setup();

    mockGetClassDetails.mockRejectedValueOnce(new Error("network error"));

    renderReports();

    expect(
      await screen.findByText(/failed to load analytics data/i),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /go back/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("refetches analytics when the period and date presets change", async () => {
    const user = userEvent.setup();

    renderReports();

    await screen.findByRole("heading", { name: /class analytics/i });

    await user.click(screen.getByRole("button", { name: /this week/i }));

    await waitFor(() => {
      expect(mockGetClassAnalytics).toHaveBeenLastCalledWith(
        classId,
        "weekly",
        expect.any(String),
        expect.any(String),
      );
    });

    await user.selectOptions(screen.getByRole("combobox"), "monthly");

    await waitFor(() => {
      expect(mockGetClassAnalytics).toHaveBeenLastCalledWith(
        classId,
        "monthly",
        expect.any(String),
        expect.any(String),
      );
    });
  });

  it("exports CSV with the fetched detailed attendance data", async () => {
    const user = userEvent.setup();

    renderReports();

    await screen.findByRole("heading", { name: /class analytics/i });

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    await waitFor(() => {
      expect(mockGetDetailedAttendance).toHaveBeenCalledWith(classId, "", "");
    });

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:reports-url");
  });
});
