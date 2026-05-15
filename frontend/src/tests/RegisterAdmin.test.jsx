import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import RegisterAdmin from "../pages/auth/RegisterAdmin";
import { renderWithProviders } from "./utils/test-utils.jsx";
import authAPI from "../services/authAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/authAPI", () => ({
  default: {
    createAdmin: vi.fn(),
  },
}));

const mockCreateAdmin = vi.mocked(authAPI.createAdmin);

describe("RegisterAdmin", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockCreateAdmin.mockReset();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("renders the admin registration form and core controls", () => {
    renderWithProviders(<RegisterAdmin />);

    expect(
      screen.getByRole("heading", { name: /secret admin portal/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/bootstrap the first admin account/i),
    ).toBeVisible();
    expect(screen.getByLabelText(/full name/i)).toBeVisible();
    expect(screen.getByLabelText(/email address/i)).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeVisible();
    expect(screen.getByLabelText(/admin secret key/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /create admin account/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /back to login/i }),
    ).toBeVisible();
  });

  it("shows a validation error when the form is submitted empty", async () => {
    renderWithProviders(<RegisterAdmin />);

    fireEvent.submit(
      screen
        .getByRole("button", { name: /create admin account/i })
        .closest("form"),
    );

    expect(screen.getByText(/all fields are required/i)).toBeVisible();
    expect(mockCreateAdmin).not.toHaveBeenCalled();
  });

  it("shows a validation error for a short password", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegisterAdmin />);

    await user.type(screen.getByLabelText(/full name/i), "Admin User");
    await user.type(
      screen.getByLabelText(/email address/i),
      "admin@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "12345");
    await user.type(screen.getByLabelText(/admin secret key/i), "SECRET123");
    await user.click(
      screen.getByRole("button", { name: /create admin account/i }),
    );

    expect(
      await screen.findByText(/password must be at least 6 characters/i),
    ).toBeVisible();
    expect(mockCreateAdmin).not.toHaveBeenCalled();
  });

  it("submits the exact typed data to the API and navigates to login on success", async () => {
    const user = userEvent.setup();

    mockCreateAdmin.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<RegisterAdmin />);

    await user.type(screen.getByLabelText(/full name/i), "Admin User");
    await user.type(
      screen.getByLabelText(/email address/i),
      "admin@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "StrongPass123!");
    await user.type(screen.getByLabelText(/admin secret key/i), "SECRET123");
    await user.click(
      screen.getByRole("button", { name: /create admin account/i }),
    );

    await waitFor(() => {
      expect(mockCreateAdmin).toHaveBeenCalledWith(
        "Admin User",
        "admin@example.com",
        "StrongPass123!",
        "SECRET123",
      );
    });

    expect(window.alert).toHaveBeenCalledWith(
      "✅ Admin account created successfully! Please login to continue.",
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("navigates back to login from the footer button", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegisterAdmin />);

    await user.click(screen.getByRole("button", { name: /back to login/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
