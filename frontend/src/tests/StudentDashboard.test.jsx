import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import StudentDashboard from "../pages/student/StudentDashboard";
import { renderWithProviders } from "./utils/test-utils.jsx";
import classAPI from "../services/classAPI";
import { logout, setCredentials } from "../features/auth/authSlice";
import { store } from "../store";

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
    joinClass: vi.fn(),
  },
}));

vi.mock("../components/modals/ExportModal", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="export-modal">Export Modal</div> : null,
}));

const mockGetAllClasses = vi.mocked(classAPI.getAllClasses);
const mockJoinClass = vi.mocked(classAPI.joinClass);

describe("StudentDashboard", () => {
  const currentUser = {
    _id: "student-1",
    name: "Alice Johnson",
    role: "student",
  };

  const enrolledClasses = [
    {
      _id: "class-1",
      name: "Computer Networks",
      department: "CSE",
      semester: "5",
      attendedSessions: 8,
      totalSessions: 10,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    store.dispatch(logout());
    store.dispatch(
      setCredentials({
        user: currentUser,
        accessToken: "student-token",
      }),
    );

    mockNavigate.mockReset();
    mockGetAllClasses.mockReset();
    mockJoinClass.mockReset();
  });

  it("renders the dashboard shell, join form, and primary actions", async () => {
    mockGetAllClasses.mockResolvedValueOnce({
      data: { classes: enrolledClasses },
    });

    renderWithProviders(<StudentDashboard />);

    expect(screen.getByText(/loading classes/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /student dashboard/i }),
    ).toBeVisible();
    expect(screen.getByText(/welcome, alice johnson!/i)).toBeVisible();
    expect(
      screen.getByPlaceholderText(/enter class code \(e\.g\., abc123\)/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /join class/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /download transcript/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /scan attendance/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /my classes/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /computer networks/i })).toBeVisible();
  });

  it("shows a validation error when the join form is submitted without a class code", async () => {
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes: [] } });

    renderWithProviders(<StudentDashboard />);

    await screen.findByRole("heading", { name: /student dashboard/i });

    const form = screen.getByRole("button", { name: /join class/i }).closest("form");
    expect(form).toBeTruthy();

    fireEvent.submit(form);

    expect(await screen.findByText(/please enter a class code/i)).toBeVisible();
    expect(mockJoinClass).not.toHaveBeenCalled();
  });

  it("submits the typed class code and calls joinClass with the exact normalized value", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({ data: { classes: [] } });
    mockJoinClass.mockResolvedValueOnce({
      data: {
        _id: "class-2",
        name: "Data Mining",
        department: "CSE",
        semester: "6",
        attendedSessions: 0,
        totalSessions: 0,
      },
    });

    renderWithProviders(<StudentDashboard />);

    await screen.findByRole("heading", { name: /student dashboard/i });

    const classCodeInput = screen.getByPlaceholderText(
      /enter class code \(e\.g\., abc123\)/i,
    );

    await user.type(classCodeInput, "abc123");
    await user.click(screen.getByRole("button", { name: /join class/i }));

    await waitFor(() => {
      expect(mockJoinClass).toHaveBeenCalledWith("ABC123");
    });

    expect(await screen.findByText(/successfully joined data mining!/i)).toBeVisible();
    expect(classCodeInput).toHaveValue("");
  });

  it("navigates to attendance details after successful class data loading", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({
      data: { classes: enrolledClasses },
    });

    renderWithProviders(<StudentDashboard />);

    await screen.findByRole("heading", { name: /computer networks/i });

    await user.click(screen.getByRole("button", { name: /view details/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/student/attendance");
  });
});
