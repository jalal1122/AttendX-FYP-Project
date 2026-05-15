import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import ScanAttendance from "../pages/student/ScanAttendance";
import { renderWithProviders } from "./utils/test-utils.jsx";
import attendanceAPI from "../services/attendanceAPI";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/attendanceAPI", () => ({
  default: {
    markAttendance: vi.fn(),
  },
}));

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getState: vi.fn(() => 1),
  })),
}));

const mockMarkAttendance = vi.mocked(attendanceAPI.markAttendance);

describe("ScanAttendance", () => {
  const fixedDeviceId = "device-fixed-123";

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("device_uuid", fixedDeviceId);

    mockNavigate.mockReset();
    mockMarkAttendance.mockReset();

    vi.restoreAllMocks();
    vi.useRealTimers();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 23.8103,
              longitude: 90.4125,
            },
          });
        }),
      },
    });
  });

  it("renders the scan attendance page and core controls", () => {
    renderWithProviders(<ScanAttendance />);

    expect(screen.getByRole("heading", { name: /scan attendance/i })).toBeVisible();
    expect(screen.getByText(/scan the qr code displayed by your teacher/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /ready to scan/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /start camera/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /developer testing mode/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /show/i })).toBeVisible();
  });

  it("prevents empty token submission in developer mode", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ScanAttendance />);

    await user.click(screen.getByRole("button", { name: /show/i }));

    const submitButton = screen.getByRole("button", { name: /submit token/i });
    expect(submitButton).toBeDisabled();

    const devForm = submitButton.closest("form");
    expect(devForm).toBeTruthy();

    fireEvent.submit(devForm);

    expect(mockMarkAttendance).not.toHaveBeenCalled();
    expect(screen.queryByText(/marking attendance/i)).not.toBeInTheDocument();
  });

  it("submits the exact typed token and location to the attendance API", async () => {
    const user = userEvent.setup();

    mockMarkAttendance.mockResolvedValueOnce({
      attendance: {
        status: "Present",
        studentId: { name: "Alice" },
      },
    });

    renderWithProviders(<ScanAttendance />);

    await user.click(screen.getByRole("button", { name: /show/i }));
    await user.type(screen.getByPlaceholderText(/paste qr token here/i), "TOKEN-123");
    await user.click(screen.getByRole("button", { name: /submit token/i }));

    await waitFor(() => {
      expect(mockMarkAttendance).toHaveBeenCalledWith(
        "TOKEN-123",
        23.8103,
        90.4125,
        fixedDeviceId,
      );
    });

    expect(
      await screen.findByText(/attendance marked successfully! welcome, alice!/i),
    ).toBeVisible();
  });

  it("navigates to the student dashboard after successful attendance marking", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const user = userEvent.setup();

    mockMarkAttendance.mockResolvedValueOnce({
      attendance: {
        status: "Present",
        studentId: { name: "Student" },
      },
    });

    renderWithProviders(<ScanAttendance />);

    await user.click(screen.getByRole("button", { name: /show/i }));
    await user.type(screen.getByPlaceholderText(/paste qr token here/i), "REDIRECT-001");
    await user.click(screen.getByRole("button", { name: /submit token/i }));

    await waitFor(() => {
      expect(mockMarkAttendance).toHaveBeenCalledWith(
        "REDIRECT-001",
        23.8103,
        90.4125,
        fixedDeviceId,
      );
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    const navigationTimeout = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    const timeoutCallback = navigationTimeout?.[0];
    timeoutCallback();

    expect(mockNavigate).toHaveBeenCalledWith("/student/dashboard");
    setTimeoutSpy.mockRestore();
  });
});
