import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";

// Mock PowerSync before importing component
const mockExecute = mock(() => Promise.resolve({ rows: [] }));
const mockPowerSync = { execute: mockExecute };

const queryResults = new Map<string, any[]>();
const setQueryResult = (sql: string, data: any[]) => {
  queryResults.set(sql, data);
};

const mockUseQuery = mock((sql: string) => ({
  data: queryResults.get(sql) ?? [],
  isLoading: false,
}));

mock.module("@powersync/react", () => ({
  usePowerSync: () => mockPowerSync,
  useQuery: mockUseQuery,
}));

const mockSession = {
  user: {
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
  },
};

mock.module("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: mockSession, isLoading: false }),
  },
}));

mock.module("@/components/providers/SystemProvider", () => ({
  disconnectDb: mock(() => {}),
}));

mock.module("@/components/prefill-price-toggle", () => ({
  default: () => null,
}));

afterEach(cleanup);

describe("ProfilePage displays user data from session", () => {
  beforeEach(() => {
    queryResults.clear();
    mockUseQuery.mockClear();

    setQueryResult(
      "SELECT COUNT(*) as mission_count FROM receipts WHERE status = 'OK'",
      [{ mission_count: 5 }]
    );
    setQueryResult(
      "SELECT COUNT(DISTINCT item_id) as items_tracked FROM receipt_items",
      [{ items_tracked: 42 }]
    );
    setQueryResult(
      "SELECT COALESCE(AVG(CASE WHEN total > 0 THEN (savings / total) * 100 ELSE 0 END), 0) as avg_variance FROM receipts WHERE status = 'OK' AND savings IS NOT NULL",
      [{ avg_variance: 12.5 }]
    );
  });

  it("displays name from session.user.name", async () => {
    const { default: ProfilePage } = await import("@/app/profile/page");
    render(<ProfilePage />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("displays email from session.user.email", async () => {
    const { default: ProfilePage } = await import("@/app/profile/page");
    render(<ProfilePage />);

    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("displays rank as UNRANKED", async () => {
    const { default: ProfilePage } = await import("@/app/profile/page");
    render(<ProfilePage />);

    expect(screen.getByText(/\/\/ RANK: UNRANKED \/\//)).toBeInTheDocument();
  });
});