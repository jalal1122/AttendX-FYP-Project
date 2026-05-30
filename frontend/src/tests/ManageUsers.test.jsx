import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import ManageUsers from "../pages/admin/ManageUsers";
import { renderWithProviders } from "./utils/test-utils.jsx";
import userAPI from "../services/userAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../services/userAPI", () => ({
  default: {
    getAllUsers: vi.fn(),
    updateUser: vi.fn(),
    updateUserRole: vi.fn(),
    deleteUser: vi.fn(),
    resetUserDevice: vi.fn(),
    createUser: vi.fn(),
  },
}));

const mockGetAllUsers = vi.mocked(userAPI.getAllUsers);
const mockUpdateUser = vi.mocked(userAPI.updateUser);
const mockUpdateUserRole = vi.mocked(userAPI.updateUserRole);

describe("ManageUsers", () => {
  const users = [
    {
      _id: "user-1",
      name: "Alice Johnson",
      email: "alice@example.com",
      role: "student",
      mobileNumber: "01700000000",
      info: {
        rollNo: "S-1001",
        semester: "5",
        department: "CSE",
      },
    },
    {
      _id: "user-2",
      name: "Bob Smith",
      email: "bob@example.com",
      role: "teacher",
      mobileNumber: "01700000000",
      info: {
        department: "EEE",
      },
    },
    {
      _id: "user-3",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      info: {
        department: "Administration",
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockGetAllUsers.mockReset();
    mockUpdateUser.mockReset();
    mockUpdateUserRole.mockReset();
    window.prompt = vi.fn();
    window.confirm = vi.fn();

    mockGetAllUsers.mockImplementation(async (filters = {}) => {
      if (filters.role === "teacher" && filters.name === "Bob") {
        return { data: { users: [users[1]] } };
      }

      return { data: { users } };
    });
  });

  it("renders the user management shell and loaded rows", async () => {
    renderWithProviders(<ManageUsers />);

    expect(screen.getByText(/loading users/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /user management/i }),
    ).toBeVisible();
    expect(screen.getByText(/manage all users in the system/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /\+ create user/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /admins/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /students/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /teachers/i })).toBeVisible();
    expect(screen.getByPlaceholderText(/filter by name/i)).toBeVisible();
    expect(screen.getByPlaceholderText(/filter by email/i)).toBeVisible();
    expect(screen.getByPlaceholderText(/filter by roll number/i)).toBeVisible();

    expect(await screen.findByText("Alice Johnson")).toBeVisible();
    expect(screen.getByText("alice@example.com")).toBeVisible();
    expect(screen.getByText("student")).toBeVisible();
    expect(screen.getByText("Bob Smith")).toBeVisible();
    expect(screen.getByText("bob@example.com")).toBeVisible();
    expect(screen.getByText("teacher")).toBeVisible();
    expect(screen.getByText("Admin User")).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("admin")).toBeVisible();
  });

  it("filters users by name and role and calls the API with exact filters", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ManageUsers />);

    await screen.findByText("Alice Johnson");

    await user.type(screen.getByPlaceholderText(/filter by name/i), "Bob");
    await user.click(screen.getByRole("button", { name: /teachers/i }));

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenLastCalledWith({
        role: "teacher",
        name: "Bob",
      });
    });

    expect(await screen.findByText("Bob Smith")).toBeVisible();
    expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument();
  });

  it("shows an error when an invalid role is entered in the role prompt", async () => {
    const user = userEvent.setup();
    vi.mocked(window.prompt).mockReturnValue("janitor");

    renderWithProviders(<ManageUsers />);

    await screen.findByText("Alice Johnson");

    await user.click(screen.getAllByRole("button", { name: /role/i })[0]);

    expect(await screen.findByText(/invalid role/i)).toBeVisible();
    expect(mockUpdateUserRole).not.toHaveBeenCalled();
  });

  it("submits edited user data and calls the update API with the typed values", async () => {
    const user = userEvent.setup();

    mockUpdateUser.mockResolvedValueOnce({ data: {} });

    renderWithProviders(<ManageUsers />);

    await screen.findByText("Alice Johnson");

    await user.click(screen.getAllByTitle(/edit user/i)[1]);

    expect(screen.getByRole("heading", { name: /edit user/i })).toBeVisible();

    const nameInput = screen.getByDisplayValue("Bob Smith");
    const mobileInput = screen.getByDisplayValue("01700000000");
    const departmentInput = screen.getByDisplayValue("EEE");

    await user.clear(nameInput);
    await user.type(nameInput, "Bob Williams");

    await user.clear(mobileInput);
    await user.type(mobileInput, "01722222222");

    await user.clear(departmentInput);
    await user.type(departmentInput, "CSE");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith("user-2", {
        name: "Bob Williams",
        mobileNumber: "01722222222",
        info: {
          rollNo: "",
          semester: "",
          department: "CSE",
        },
      });
    });

    expect(await screen.findByText(/user updated successfully/i)).toBeVisible();
  });

  it("switches to the admin tab and filters the visible rows", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ManageUsers />);

    await screen.findByText("Alice Johnson");

    await user.click(screen.getByRole("button", { name: /admins/i }));

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenLastCalledWith({
        role: "admin",
      });
    });

    expect(await screen.findByText("Admin User")).toBeVisible();
  });

  it("navigates back to the admin dashboard from the header button", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ManageUsers />);

    await screen.findByText("Alice Johnson");

    await user.click(
      screen.getByRole("button", { name: /back to dashboard/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });
});
