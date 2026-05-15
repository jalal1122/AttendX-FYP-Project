import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import Login from "../pages/auth/Login";
import { renderWithProviders } from "./utils/test-utils.jsx";
import { logout, setError } from "../features/auth/authSlice";
import { store } from "../store";
import api from "../services/api";
import authAPI from "../services/authAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("../services/authAPI", () => ({
  default: {
    validate2FALogin: vi.fn(),
  },
}));

const mockApiPost = vi.mocked(api.post);
const mockValidate2FALogin = vi.mocked(authAPI.validate2FALogin);

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    store.dispatch(logout());
    store.dispatch(setError(null));
    mockNavigate.mockReset();
    mockApiPost.mockReset();
    mockValidate2FALogin.mockReset();
  });

  it("renders the core login form controls", () => {
    renderWithProviders(<Login />);

    expect(
      screen.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/email/i)).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /login/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /forgot password/i }),
    ).toBeVisible();
  });

  it("shows a login error message when credentials are invalid", async () => {
    const user = userEvent.setup();

    mockApiPost.mockRejectedValueOnce({
      response: { data: { message: "Invalid email or password" } },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), "teacher@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeVisible();
  });

  it("submits the exact login payload entered by the user", async () => {
    const user = userEvent.setup();

    mockApiPost.mockResolvedValueOnce({
      data: {
        data: {
          user: { role: "teacher" },
          accessToken: "access-token",
        },
      },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), "teacher@example.com");
    await user.type(
      screen.getByLabelText(/password/i),
      "CorrectHorseBatteryStaple!",
    );
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/auth/login", {
        email: "teacher@example.com",
        password: "CorrectHorseBatteryStaple!",
      });
    });
  });

  it("navigates to the teacher dashboard after a successful login", async () => {
    const user = userEvent.setup();

    mockApiPost.mockResolvedValueOnce({
      data: {
        data: {
          user: { role: "teacher" },
          accessToken: "access-token",
        },
      },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), "teacher@example.com");
    await user.type(
      screen.getByLabelText(/password/i),
      "CorrectHorseBatteryStaple!",
    );
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/teacher/dashboard");
    });
  });

  it("shows a validation error for an invalid 2FA verification code", async () => {
    const user = userEvent.setup();

    mockApiPost.mockResolvedValueOnce({
      data: {
        data: {
          require2FA: true,
          tempToken: "temp-token",
        },
      },
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/email/i), "teacher@example.com");
    await user.type(
      screen.getByLabelText(/password/i),
      "CorrectHorseBatteryStaple!",
    );
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/two-factor authentication/i)).toBeVisible();

    await user.type(screen.getByPlaceholderText("000000"), "12345");
    await user.click(screen.getByRole("button", { name: /verify/i }));

    expect(
      await screen.findByText(/please enter a valid 6-digit code/i),
    ).toBeVisible();
    expect(mockValidate2FALogin).not.toHaveBeenCalled();
  });
});
