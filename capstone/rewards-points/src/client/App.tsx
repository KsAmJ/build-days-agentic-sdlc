import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  Member,
  PointsTransaction,
} from "../shared/contracts.js";
import {
  ApiRequestError,
  createTransaction,
  getBalance,
  listMembers,
  listTransactions,
} from "./api.js";

type LoadState = "loading" | "ready" | "error";

interface StatusMessage {
  kind: "success" | "error";
  text: string;
}

const memberName = (members: Member[], memberId: string): string =>
  members.find((member) => member.id === memberId)?.displayName ?? memberId;

export const App = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [memberId, setMemberId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const [loadedMembers, loadedTransactions] = await Promise.all([
        listMembers(),
        listTransactions(),
      ]);
      setMembers(loadedMembers);
      setTransactions(loadedTransactions);
      setMemberId((current) => current || (loadedMembers[0]?.id ?? ""));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshBalance = useCallback(async (selectedMember: string) => {
    if (!selectedMember) {
      setBalance(null);
      return;
    }
    try {
      const result = await getBalance(selectedMember);
      setBalance(result.balance);
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    void refreshBalance(memberId);
  }, [memberId, refreshBalance]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const created = await createTransaction({
        memberId,
        points: Number(points),
        reason,
      });
      setTransactions((current) => [created, ...current]);
      setPoints("");
      setReason("");
      setStatus({
        kind: "success",
        text: `Recorded ${created.points} points for ${memberName(
          members,
          created.memberId,
        )}.`,
      });
      await refreshBalance(memberId);
      statusRef.current?.focus();
    } catch (error) {
      if (error instanceof ApiRequestError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
      }
      const text =
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
      setStatus({ kind: "error", text });
      statusRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const orderedTransactions = useMemo(() => transactions, [transactions]);

  if (loadState === "loading") {
    return (
      <main>
        <h1>Rewards Points</h1>
        <p role="status">Loading rewards data…</p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main>
        <h1>Rewards Points</h1>
        <p className="status status-error" role="alert">
          We could not load rewards data.
        </p>
        <button type="button" onClick={() => void load()}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Rewards Points</h1>
      <p>Record points a member earns and see their running balance.</p>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <label htmlFor="member">
          Member
          <select
            id="member"
            name="member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            aria-describedby={
              fieldErrors.memberId ? "member-error" : undefined
            }
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
          {fieldErrors.memberId ? (
            <span className="field-error" id="member-error">
              {fieldErrors.memberId.join(" ")}
            </span>
          ) : null}
        </label>

        <label htmlFor="points">
          Points
          <input
            id="points"
            name="points"
            type="number"
            min={1}
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            aria-describedby={fieldErrors.points ? "points-error" : undefined}
          />
          {fieldErrors.points ? (
            <span className="field-error" id="points-error">
              {fieldErrors.points.join(" ")}
            </span>
          ) : null}
        </label>

        <label htmlFor="reason">
          Reason
          <input
            id="reason"
            name="reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby={fieldErrors.reason ? "reason-error" : undefined}
          />
          {fieldErrors.reason ? (
            <span className="field-error" id="reason-error">
              {fieldErrors.reason.join(" ")}
            </span>
          ) : null}
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Recording…" : "Record points"}
        </button>
      </form>

      <p
        className={
          status
            ? `status ${status.kind === "success" ? "status-success" : "status-error"}`
            : "visually-hidden"
        }
        role={status?.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        tabIndex={-1}
        ref={statusRef}
      >
        {status?.text ?? ""}
      </p>

      <section aria-labelledby="balance-heading">
        <h2 id="balance-heading">Balance</h2>
        <p className="balance">
          {memberName(members, memberId)}:{" "}
          {balance === null ? "—" : `${balance} points`}
        </p>
      </section>

      <section aria-labelledby="transactions-heading">
        <h2 id="transactions-heading">Transactions</h2>
        {orderedTransactions.length === 0 ? (
          <p>No points have been recorded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Points</th>
                <th scope="col">Reason</th>
                <th scope="col">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {orderedTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{memberName(members, transaction.memberId)}</td>
                  <td>{transaction.points}</td>
                  <td>{transaction.reason}</td>
                  <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
};
