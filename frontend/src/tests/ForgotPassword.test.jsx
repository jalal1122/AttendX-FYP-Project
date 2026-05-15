import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import ForgotPassword from "../pages/auth/ForgotPassword";
import { renderWithProviders } from "./utils/test-utils.jsx";
import api from "../services/api";

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
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

const mockApiPost = vi.mocked(api.post);

describe("ForgotPassword", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockApiPost.mockReset();
  });

  const setupUser = () => userEvent.setup();

  it("renders the forgot password form and core controls", () => {
    renderWithProviders(<ForgotPassword />);

    expect(
      screen.getByRole("heading", { name: /forgot password/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/enter your email to receive a reset code/i),
    ).toBeVisible();
    expect(
      screen.getByPlaceholderText(/your\.email@example\.com/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /send otp/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeVisible();
  });

  it("shows a validation error when the email form is submitted empty", async () => {
    renderWithProviders(<ForgotPassword />);

    fireEvent.submit(
      screen.getByRole("button", { name: /send otp/i }).closest("form"),
    );

    expect(screen.getByText(/email is required/i)).toBeVisible();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("requests an OTP with the typed email and advances to the reset step", async () => {
    const user = setupUser();

    mockApiPost.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<ForgotPassword />);

    await user.type(
      screen.getByPlaceholderText(/your\.email@example\.com/i),
      "student@example.com",
    );
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "student@example.com",
      });
    });

    expect(
      await screen.findByRole("heading", { name: /reset password/i }),
    ).toBeVisible();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.includes("student@example.com"),
      ),
    ).toBeVisible();
    expect(screen.getByPlaceholderText(/enter 6-digit code/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /reset password/i }),
    ).toBeVisible();
  });

  it("shows validation errors for invalid reset data", async () => {
    const user = setupUser();

    mockApiPost.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<ForgotPassword />);

    await user.type(
      screen.getByPlaceholderText(/your\.email@example\.com/i),
      "student@example.com",
    );
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    expect(
      await screen.findByRole("heading", { name: /reset password/i }),
    ).toBeVisible();

    await user.type(
      screen.getByPlaceholderText(/enter 6-digit code/i),
      "12345",
    );
    await user.type(
      screen.getByPlaceholderText(/enter new password/i),
      "secret1",
    );
    await user.type(
      screen.getByPlaceholderText(/confirm new password/i),
      "secret2",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/otp must be 6 digits/i)).toBeVisible();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it("submits the reset request with the exact typed data and navigates to login on success", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const user = setupUser();

    mockApiPost
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<ForgotPassword />);

    await user.type(
      screen.getByPlaceholderText(/your\.email@example\.com/i),
      "student@example.com",
    );
    await user.click(screen.getByRole("button", { name: /send otp/i }));

    expect(
      await screen.findByRole("heading", { name: /reset password/i }),
    ).toBeVisible();

    await user.clear(screen.getByPlaceholderText(/enter 6-digit code/i));
    await user.type(
      screen.getByPlaceholderText(/enter 6-digit code/i),
      "123456",
    );
    await user.type(
      screen.getByPlaceholderText(/enter new password/i),
      "newpass123",
    );
    await user.type(
      screen.getByPlaceholderText(/confirm new password/i),
      "newpass123",
    );
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenLastCalledWith("/auth/reset-password", {
        email: "student@example.com",
        otp: "123456",
        newPassword: "newpass123",
      });
    });

    expect(await screen.findByText(/password reset successful/i)).toBeVisible();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    const navigationTimeout = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 2000,
    );
    const timeoutCallback = navigationTimeout?.[0];
    timeoutCallback();

    expect(mockNavigate).toHaveBeenCalledWith("/login");
    setTimeoutSpy.mockRestore();
  });
});
