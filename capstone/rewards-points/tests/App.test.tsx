// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Member, PointsTransaction } from "../src/shared/contracts.js";

const members: Member[] = [
  { id: "mbr-ada", displayName: "Ada Lovelace" },
  { id: "mbr-grace", displayName: "Grace Hopper" },
];

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn(),
  listTransactions: vi.fn(),
  createTransaction: vi.fn(),
  getBalance: vi.fn(),
}));

vi.mock("../src/client/api.js", async () => {
  const actual = await vi.importActual<typeof import("../src/client/api.js")>(
    "../src/client/api.js",
  );
  return { ...actual, ...mocks };
});

const { ApiRequestError } = await import("../src/client/api.js");
const { App } = await import("../src/client/App.js");

beforeEach(() => {
  mocks.listMembers.mockResolvedValue(members);
  mocks.listTransactions.mockResolvedValue([]);
  mocks.getBalance.mockResolvedValue({ memberId: "mbr-ada", balance: 0 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App", () => {
  it("shows a loading state and then the empty state", async () => {
    render(<App />);
    expect(screen.getByText(/loading rewards data/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/no points have been recorded yet/i),
    ).toBeInTheDocument();
  });

  it("records points and shows an accessible success status", async () => {
    const created: PointsTransaction = {
      id: "t1",
      memberId: "mbr-ada",
      points: 100,
      reason: "Purchase bonus",
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    mocks.createTransaction.mockResolvedValue(created);
    mocks.getBalance.mockResolvedValue({ memberId: "mbr-ada", balance: 100 });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/no points have been recorded yet/i);

    await user.type(screen.getByLabelText(/points/i), "100");
    await user.type(screen.getByLabelText(/reason/i), "Purchase bonus");
    await user.click(screen.getByRole("button", { name: /record points/i }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/recorded 100 points/i);
    expect(status).toHaveFocus();
  });

  it("surfaces validation errors associated with fields", async () => {
    mocks.createTransaction.mockRejectedValue(
      new ApiRequestError("Check the highlighted fields and try again.", {
        points: ["Points must be greater than zero."],
      }),
    );

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/no points have been recorded yet/i);

    await user.type(screen.getByLabelText(/points/i), "5");
    await user.type(screen.getByLabelText(/reason/i), "x");
    await user.click(screen.getByRole("button", { name: /record points/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/points must be greater than zero/i),
      ).toBeInTheDocument();
    });
    const pointsInput = screen.getByLabelText(/points/i);
    expect(pointsInput).toHaveAttribute("aria-describedby", "points-error");
  });
});
