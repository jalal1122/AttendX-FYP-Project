import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import AdminReports from "../pages/admin/AdminReports";
import { renderWithProviders } from "./utils/test-utils.jsx";
import { setCredentials } from "../features/auth/authSlice";
import { store } from "../store";
import classAPI from "../services/classAPI";
import userAPI from "../services/userAPI";
import axios from "axios";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/classAPI", () => ({
  default: {
    getAllClasses: vi.fn(),
  },
}));

vi.mock("../services/userAPI", () => ({
  default: {
    getUserStats: vi.fn(),
  },
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
  },
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

const mockGetAllClasses = vi.mocked(classAPI.getAllClasses);
const mockGetUserStats = vi.mocked(userAPI.getUserStats);
const mockAxiosGet = vi.mocked(axios.get);

describe("AdminReports", () => {
  const classes = [
    {
      _id: "class-1",
      name: "Computer Networks",
      semester: "5",
      code: "CN501",
      department: "CS",
      students: [{ _id: "s1" }, { _id: "s2" }],
    },
    {
      _id: "class-2",
      name: "Operating Systems",
      semester: "6",
      code: "OS601",
      department: "IT",
      students: [{ _id: "s3" }],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    store.dispatch(
      setCredentials({
        user: { role: "admin", name: "Admin User" },
        accessToken: "test-token",
      }),
    );
    mockNavigate.mockReset();
    mockGetAllClasses.mockReset();
    mockGetUserStats.mockReset();
    mockAxiosGet.mockReset();
    window.URL.createObjectURL = vi.fn(() => "blob:report-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders the reports page and core actions without crashing", async () => {
    mockGetUserStats.mockResolvedValueOnce({
      data: {
        totalUsers: 40,
        totalStudents: 30,
        totalTeachers: 8,
        totalAdmins: 2,
      },
    });
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<AdminReports />);

    expect(screen.getByText(/loading report data/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /system reports/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/overview of system-wide statistics and analytics/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /generate system report/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /export json/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeVisible();
  });

  it("shows the computed summary, chart placeholders, and department table after loading data", async () => {
    mockGetUserStats.mockResolvedValueOnce({
      data: {
        totalUsers: 40,
        totalStudents: 30,
        totalTeachers: 8,
        totalAdmins: 2,
      },
    });
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<AdminReports />);

    await waitFor(() => {
      expect(mockGetUserStats).toHaveBeenCalledTimes(1);
      expect(mockGetAllClasses).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByRole("heading", { name: /total users/i }).parentElement,
    ).toHaveTextContent("40");
    expect(
      screen.getByRole("heading", { name: /total students/i }).parentElement,
    ).toHaveTextContent("30");
    expect(
      screen.getByRole("heading", { name: /total teachers/i }).parentElement,
    ).toHaveTextContent("8");
    expect(
      screen.getByRole("heading", { name: /total classes/i }).parentElement,
    ).toHaveTextContent("2");

    expect(screen.getByText(/user role distribution/i)).toBeVisible();
    expect(screen.getByText(/classes by department/i)).toBeVisible();
    expect(screen.getByText(/classes by semester/i)).toBeVisible();
    expect(screen.getByText(/department details/i)).toBeVisible();
    expect(screen.getByText("CS")).toBeVisible();
    expect(screen.getByText("IT")).toBeVisible();
    expect(screen.getByText("2.0")).toBeVisible();
    expect(screen.getByText("1.0")).toBeVisible();
  });

  it("validates export modal input when a report requires a target id", async () => {
    const user = userEvent.setup();

    mockGetUserStats.mockResolvedValueOnce({
      data: {
        totalUsers: 40,
        totalStudents: 30,
        totalTeachers: 8,
        totalAdmins: 2,
      },
    });
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<AdminReports />);

    await screen.findByRole("heading", { name: /system reports/i });

    await user.click(
      screen.getByRole("button", { name: /generate system report/i }),
    );
    await user.click(screen.getByText(/class attendance register/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    expect(await screen.findByText(/please enter class id/i)).toBeVisible();
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it("submits the exact export parameters and downloads the generated report", async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    mockGetUserStats.mockResolvedValueOnce({
      data: {
        totalUsers: 40,
        totalStudents: 30,
        totalTeachers: 8,
        totalAdmins: 2,
      },
    });
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });
    mockAxiosGet.mockResolvedValueOnce({
      data: new Blob(["report-bytes"]),
      headers: {
        "content-disposition":
          'attachment; filename="AttendX_Class_Report.xlsx"',
      },
    });

    renderWithProviders(<AdminReports />);

    await screen.findByRole("heading", { name: /system reports/i });

    await user.click(
      screen.getByRole("button", { name: /generate system report/i }),
    );
    await user.click(screen.getByText(/class attendance register/i));
    await user.type(screen.getByPlaceholderText(/enter class id/i), "CLS-101");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining("/analytics/export"),
        expect.objectContaining({
          params: {
            type: "class_matrix",
            format: "xlsx",
            range: "semester",
            targetId: "CLS-101",
          },
          headers: { Authorization: "Bearer test-token" },
          responseType: "blob",
        }),
      );
    });

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:report-url");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("navigates back to the admin dashboard from the header action", async () => {
    const user = userEvent.setup();

    mockGetUserStats.mockResolvedValueOnce({
      data: {
        totalUsers: 40,
        totalStudents: 30,
        totalTeachers: 8,
        totalAdmins: 2,
      },
    });
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<AdminReports />);

    await screen.findByRole("heading", { name: /system reports/i });

    await user.click(
      screen.getByRole("button", { name: /back to dashboard/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });
});
