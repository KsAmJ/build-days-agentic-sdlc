import type {
  ApiError,
  CreateTransactionRequest,
  Member,
  MemberBalance,
  PointsTransaction,
} from "../shared/contracts.js";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options?.headers,
    },
  });
  const body = (await response.json()) as T | ApiError;
  if (!response.ok) {
    const apiError = body as ApiError;
    throw new ApiRequestError(
      apiError.error?.message ?? "Something went wrong. Try again.",
      apiError.error?.fieldErrors,
    );
  }
  return body as T;
}

export const listMembers = async (): Promise<Member[]> => {
  const result = await request<{ members: Member[] }>("/api/members");
  return result.members;
};

export const listTransactions = async (): Promise<PointsTransaction[]> => {
  const result = await request<{ items: PointsTransaction[] }>(
    "/api/transactions",
  );
  return result.items;
};

export const createTransaction = async (
  input: CreateTransactionRequest,
): Promise<PointsTransaction> => {
  const result = await request<{ transaction: PointsTransaction }>(
    "/api/transactions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return result.transaction;
};

export const getBalance = (memberId: string): Promise<MemberBalance> =>
  request<MemberBalance>(
    `/api/members/${encodeURIComponent(memberId)}/balance`,
  );
