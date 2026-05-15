import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Profile from "../pages/common/Profile";
import { renderWithProviders } from "./utils/test-utils.jsx";
import { setCredentials } from "../features/auth/authSlice";
import { store } from "../store";
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
    enable2FA: vi.fn(),
    verify2FA: vi.fn(),
    disable2FA: vi.fn(),
  },
}));

const mockEnable2FA = vi.mocked(authAPI.enable2FA);
const mockVerify2FA = vi.mocked(authAPI.verify2FA);
const mockDisable2FA = vi.mocked(authAPI.disable2FA);

describe("Profile", () => {
  const user = {
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "student",
    info: {
      rollNo: "S-1001",
      department: "CSE",
      semester: "5",
      batch: "2021-2025",
    },
    isTwoFactorEnabled: false,
  };

  beforeEach(() => {
    localStorage.clear();
    store.dispatch(
      setCredentials({
        user,
        accessToken: "test-token",
      }),
    );
    mockNavigate.mockReset();
    mockEnable2FA.mockReset();
    mockVerify2FA.mockReset();
    mockDisable2FA.mockReset();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("renders the profile shell and account information without crashing", () => {
    renderWithProviders(<Profile />);

    expect(
      screen.getByRole("heading", { name: /profile & settings/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /back/i })).toBeVisible();
    expect(screen.getByText("Alice Johnson")).toBeVisible();
    expect(screen.getByText("alice@example.com")).toBeVisible();
    expect(screen.getByText(/student/i)).toBeVisible();
    expect(screen.getByText(/roll number/i)).toBeVisible();
    expect(screen.getByText("S-1001")).toBeVisible();
    expect(screen.getByText(/department/i)).toBeVisible();
    expect(screen.getByText("CSE")).toBeVisible();
    expect(screen.getByText("Semester", { selector: "dt" })).toBeVisible();
    expect(screen.getByText(/semester 5/i)).toBeVisible();
    expect(screen.getByText(/two-factor authentication/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /enable 2fa/i })).toBeVisible();
  });

  it("shows a validation error when enabling 2FA verification without a valid code", async () => {
    const userEventInstance = userEvent.setup();

    mockEnable2FA.mockResolvedValueOnce({
      data: {
        qrCode: "data:image/png;base64,qr",
        secret: "SECRET-123",
      },
    });

    renderWithProviders(<Profile />);

    await userEventInstance.click(
      screen.getByRole("button", { name: /enable 2fa/i }),
    );

    await waitFor(() => {
      expect(mockEnable2FA).toHaveBeenCalledTimes(1);
    });

    await userEventInstance.type(
      screen.getByPlaceholderText("000000"),
      "12345",
    );
    await userEventInstance.click(
      screen.getByRole("button", { name: /verify & activate 2fa/i }),
    );

    expect(
      await screen.findByText(/please enter a valid 6-digit code/i),
    ).toBeVisible();
    expect(mockVerify2FA).not.toHaveBeenCalled();
  });

  it("calls the 2FA enable and verify APIs with the typed verification code", async () => {
    const userEventInstance = userEvent.setup();

    mockEnable2FA.mockResolvedValueOnce({
      data: {
        qrCode: "data:image/png;base64,qr",
        secret: "SECRET-123",
      },
    });
    mockVerify2FA.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<Profile />);

    await userEventInstance.click(
      screen.getByRole("button", { name: /enable 2fa/i }),
    );

    expect(await screen.findByAltText(/2fa qr code/i)).toBeVisible();
    expect(screen.getByText(/step 2: enter verification code/i)).toBeVisible();

    await userEventInstance.type(
      screen.getByPlaceholderText("000000"),
      "12a34b56",
    );
    await userEventInstance.click(
      screen.getByRole("button", { name: /verify & activate 2fa/i }),
    );

    await waitFor(() => {
      expect(mockVerify2FA).toHaveBeenCalledWith("123456", "SECRET-123");
    });

    expect(await screen.findByText(/2fa enabled successfully/i)).toBeVisible();
  });

  it("disables 2FA after entering a valid code in the disable flow", async () => {
    const userEventInstance = userEvent.setup();

    store.dispatch(
      setCredentials({
        user: { ...user, isTwoFactorEnabled: true },
        accessToken: "test-token",
      }),
    );

    mockDisable2FA.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<Profile />);

    await userEventInstance.click(
      screen.getByRole("button", { name: /disable 2fa/i }),
    );
    await userEventInstance.type(
      screen.getByPlaceholderText("000000"),
      "987654",
    );
    await userEventInstance.click(
      screen.getByRole("button", { name: /confirm disable/i }),
    );

    await waitFor(() => {
      expect(mockDisable2FA).toHaveBeenCalledWith("987654");
    });

    expect(await screen.findByText(/2fa disabled successfully/i)).toBeVisible();
  });

  it("navigates back when the back button is clicked", async () => {
    const userEventInstance = userEvent.setup();

    renderWithProviders(<Profile />);

    await userEventInstance.click(
      screen.getByRole("button", { name: /back/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
