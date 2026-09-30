import { z } from "zod";

/**
 * Fixed, seeded member set. Members are never created, edited, or removed at
 * runtime. Each member has a stable identifier and a display name.
 */
export interface Member {
  id: string;
  displayName: string;
}

export const members: readonly Member[] = [
  { id: "mbr-ada", displayName: "Ada Lovelace" },
  { id: "mbr-grace", displayName: "Grace Hopper" },
  { id: "mbr-alan", displayName: "Alan Turing" },
  { id: "mbr-katherine", displayName: "Katherine Johnson" },
] as const;

const memberIds = members.map((member) => member.id) as [string, ...string[]];

export const isKnownMember = (memberId: string): boolean =>
  members.some((member) => member.id === memberId);

export const limits = {
  /** Maximum points that can be earned in a single transaction. */
  maxPoints: 100_000,
  /** Maximum length of the reason text. */
  reason: 200,
} as const;

export const createTransactionSchema = z.object({
  memberId: z
    .enum(memberIds, { message: "Select a known member." }),
  points: z
    .number({ message: "Enter a whole number of points." })
    .int("Points must be a whole number.")
    .positive("Points must be greater than zero.")
    .max(limits.maxPoints, `Points must be ${limits.maxPoints} or fewer.`),
  reason: z
    .string()
    .trim()
    .min(1, "Enter a reason.")
    .max(limits.reason, `Keep the reason to ${limits.reason} characters or fewer.`),
});

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;

export interface PointsTransaction extends CreateTransactionRequest {
  id: string;
  createdAt: string;
}

export interface MemberBalance {
  memberId: string;
  balance: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
