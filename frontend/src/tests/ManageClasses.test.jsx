import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import ManageClasses from "../pages/admin/ManageClasses";
import { renderWithProviders } from "./utils/test-utils.jsx";
import classAPI from "../services/classAPI";

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

const mockGetAllClasses = vi.mocked(classAPI.getAllClasses);

describe("ManageClasses", () => {
  const classes = [
    {
      _id: "class-1",
      name: "Computer Networks",
      semester: "5",
      code: "CN501",
      department: "CS",
      teacher: { name: "Dr. Ada Lovelace" },
      students: [{ _id: "s1" }, { _id: "s2" }],
      batch: "2025A",
      academicYear: "2025-2026",
    },
    {
      _id: "class-2",
      name: "Operating Systems",
      semester: "6",
      code: "OS601",
      department: "IT",
      teacher: { name: "Dr. Alan Turing" },
      students: [{ _id: "s3" }],
      academicYear: "2025-2026",
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    mockGetAllClasses.mockReset();
  });

  it("renders the page shell and core controls without crashing", async () => {
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<ManageClasses />);

    expect(screen.getByText(/loading classes/i)).toBeVisible();

    expect(
      await screen.findByRole("heading", { name: /manage classes/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/view and manage all classes in the system/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeVisible();
    expect(
      screen.getByPlaceholderText(/search by name or code/i),
    ).toBeVisible();
    expect(screen.getByRole("combobox")).toBeVisible();
  });

  it("loads classes and renders the computed cards and summary", async () => {
    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<ManageClasses />);

    await waitFor(() => {
      expect(mockGetAllClasses).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByRole("heading", { name: /computer networks/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /operating systems/i }),
    ).toBeVisible();
    expect(screen.getByText(/semester 5/i)).toBeVisible();
    expect(screen.getByText(/semester 6/i)).toBeVisible();
    expect(screen.getByText("CN501")).toBeVisible();
    expect(screen.getByText("OS601")).toBeVisible();
    expect(screen.getByText(/dr\. ada lovelace/i)).toBeVisible();
    expect(screen.getByText(/dr\. alan turing/i)).toBeVisible();

    expect(
      within(screen.getByText(/total classes/i).parentElement).getByText("2"),
    ).toBeVisible();
    expect(
      within(screen.getByText(/total enrollments/i).parentElement).getByText(
        "3",
      ),
    ).toBeVisible();
    expect(
      within(
        screen.getByText("Departments", { selector: "p" }).parentElement,
      ).getByText("2"),
    ).toBeVisible();
  });

  it("filters classes by search and department, then shows the empty state for invalid filters", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<ManageClasses />);

    await screen.findByRole("heading", { name: /manage classes/i });

    await user.type(
      screen.getByPlaceholderText(/search by name or code/i),
      "networks",
    );
    expect(
      screen.getByRole("heading", { name: /computer networks/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: /operating systems/i }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search by name or code/i));
    await user.selectOptions(screen.getByRole("combobox"), "IT");
    expect(
      screen.getByRole("heading", { name: /operating systems/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: /computer networks/i }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search by name or code/i));
    await user.type(
      screen.getByPlaceholderText(/search by name or code/i),
      "does-not-exist",
    );
    expect(await screen.findByText(/no classes found/i)).toBeVisible();
  });

  it("navigates to the class details page when a card action is clicked", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<ManageClasses />);

    await screen.findByRole("heading", { name: /manage classes/i });

    const networkCard = screen
      .getByRole("heading", { name: /computer networks/i })
      .closest('div[class*="p-6"]');
    expect(networkCard).toBeTruthy();

    const cardContainer = screen
      .getByRole("heading", { name: /computer networks/i })
      .closest("div");
    expect(cardContainer).toBeTruthy();

    await user.click(
      screen.getAllByRole("button", { name: /view details/i })[0],
    );

    expect(mockNavigate).toHaveBeenCalledWith("/teacher/class/class-1");
  });

  it("navigates back to the admin dashboard from the header button", async () => {
    const user = userEvent.setup();

    mockGetAllClasses.mockResolvedValueOnce({ data: { classes } });

    renderWithProviders(<ManageClasses />);

    await screen.findByRole("heading", { name: /manage classes/i });

    await user.click(
      screen.getByRole("button", { name: /back to dashboard/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });
});
