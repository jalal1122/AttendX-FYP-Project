import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { renderWithProviders } from "./utils/test-utils.jsx";
import classAPI from "../services/classAPI";
import userAPI from "../services/userAPI";

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

const mockGetAllClasses = vi.mocked(classAPI.getAllClasses);
const mockGetUserStats = vi.mocked(userAPI.getUserStats);

describe("AdminDashboard", () => {
  const classes = [
    {
      _id: "class-1",
      name: "Computer Networks",
      semester: "5",
      code: "CN501",
      department: "CS",
      teacher: { name: "Dr. Ada Lovelace" },
      students: [{ _id: "s1" }, { _id: "s2" }],
    },
    {
      _id: "class-2",
      name: "Operating Systems",
      semester: "6",
      code: "OS601",
      department: "IT",
      teacher: { name: "Dr. Alan Turing" },
      students: [{ _id: "s3" }],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockGetAllClasses.mockReset();
    mockGetUserStats.mockReset();
  });

  it("renders the dashboard shell and core controls without crashing", async () => {
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });
    mockGetUserStats.mockResolvedValueOnce({
      data: { totalStudents: 120, totalTeachers: 18 },
    });

    renderWithProviders(<AdminDashboard />);

    expect(screen.getByText(/loading dashboard/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /admin dashboard/i }),
    ).toBeVisible();
    expect(screen.getByText(/system overview and management/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /view all users/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /view all classes/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /generate reports/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^view all$/i })).toBeVisible();
    expect(screen.getByText(/system health/i)).toBeVisible();
  });

  it("loads dashboard data and renders the computed stats and recent classes", async () => {
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });
    mockGetUserStats.mockResolvedValueOnce({
      data: { totalStudents: 120, totalTeachers: 18 },
    });

    renderWithProviders(<AdminDashboard />);

    await waitFor(() => {
      expect(mockGetAllClasses).toHaveBeenCalledTimes(1);
      expect(mockGetUserStats).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/total classes/i).parentElement).toHaveTextContent(
      "2",
    );
    expect(screen.getByText(/total students/i).parentElement).toHaveTextContent(
      "120",
    );
    expect(screen.getByText(/total teachers/i).parentElement).toHaveTextContent(
      "18",
    );

    expect(screen.getByText(/computer networks/i)).toBeVisible();
    expect(screen.getByText(/operating systems/i)).toBeVisible();
    expect(screen.getByText("CN501")).toBeVisible();
    expect(screen.getByText("OS601")).toBeVisible();
    expect(screen.getByText(/dr\. ada lovelace/i)).toBeVisible();
    expect(screen.getByText(/dr\. alan turing/i)).toBeVisible();
  });

  it("handles API failures gracefully and falls back to the empty dashboard state", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockGetAllClasses.mockRejectedValueOnce(new Error("network error"));
    mockGetUserStats.mockRejectedValueOnce(new Error("network error"));

    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByRole("heading", { name: /admin dashboard/i }),
    ).toBeVisible();
    expect(screen.getByText(/no classes found/i)).toBeVisible();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("navigates to admin routes from the quick action buttons", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });
    mockGetUserStats.mockResolvedValueOnce({
      data: { totalStudents: 120, totalTeachers: 18 },
    });

    renderWithProviders(<AdminDashboard />);

    await screen.findByRole("heading", { name: /admin dashboard/i });

    await user.click(screen.getByRole("button", { name: /view all users/i }));
    await user.click(screen.getByRole("button", { name: /view all classes/i }));
    await user.click(screen.getByRole("button", { name: /generate reports/i }));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, "/admin/users");
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "/admin/classes");
    expect(mockNavigate).toHaveBeenNthCalledWith(3, "/admin/reports");
  });
});
