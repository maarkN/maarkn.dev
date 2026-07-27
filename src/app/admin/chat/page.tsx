import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { CHAT_LIMITS } from "@/lib/chat-log";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminChatPage({
  searchParams,
}: PageProps<"/admin/chat">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(pick(params.page) ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const dayStart = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);

  const [total, todayCount, uniqueVisitors, totals, todayTotals, rows] =
    dbConfigured
      ? await Promise.all([
          db.chatLog.count(),
          db.chatLog.count({ where: { createdAt: { gte: dayStart } } }),
          db.chatLog.groupBy({ by: ["clientKeyHash"] }).then((g) => g.length),
          db.chatLog.aggregate({
            _sum: { promptTokens: true, answerTokens: true },
          }),
          db.chatLog.aggregate({
            where: { createdAt: { gte: dayStart } },
            _sum: { promptTokens: true, answerTokens: true },
          }),
          db.chatLog.findMany({
            orderBy: { createdAt: "desc" },
            skip,
            take: PAGE_SIZE,
          }),
        ])
      : [0, 0, 0, { _sum: {} }, { _sum: {} }, []];

  const totalTokens =
    (totals._sum.promptTokens ?? 0) + (totals._sum.answerTokens ?? 0);
  const todayTokens =
    (todayTotals._sum.promptTokens ?? 0) + (todayTotals._sum.answerTokens ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dailyPct = Math.min(
    100,
    Math.round((todayCount / CHAT_LIMITS.dailyMax) * 100)
  );

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          Assistant
        </p>
        <h1 className="mt-2 font-display text-[1.8rem] font-bold tracking-tight text-[var(--text)]">
          Chat usage &amp; logs
        </h1>
        <p className="mt-2 max-w-xl text-sm font-light text-[var(--muted)]">
          Every visitor turn that reaches the model, with rough token estimates.
          Rate limits: {CHAT_LIMITS.perIpMax} msgs/visitor per{" "}
          {Math.round(CHAT_LIMITS.perIpWindowMs / 60000)}min ·{" "}
          {CHAT_LIMITS.dailyMax}/day globally.
        </p>
      </div>

      {!dbConfigured ? (
        <p className="mt-6 inline-block border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-[var(--red)]">
          DATABASE_URL is not set — chat logs are unavailable.
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Messages" value={fmt(total)} />
        <Stat label="Today" value={fmt(todayCount)} />
        <Stat label="Visitors" value={fmt(uniqueVisitors)} />
        <Stat label="Tokens (est.)" value={fmt(totalTokens)} />
        <Stat label="Tokens today" value={fmt(todayTokens)} />
        <Stat
          label="Daily budget"
          value={`${dailyPct}%`}
          hint={`${fmt(todayCount)} / ${fmt(CHAT_LIMITS.dailyMax)}`}
          bar={dailyPct}
        />
      </div>

      <div className="mt-8 overflow-x-auto border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <tr>
              <Th>When</Th>
              <Th>Conversation</Th>
              <Th className="hidden md:table-cell">Visitor</Th>
              <Th className="hidden sm:table-cell">Status</Th>
              <Th className="text-right">Tokens</Th>
              <Th className="hidden lg:table-cell text-right">Latency</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="bg-[var(--surface)] px-4 py-12 text-center text-[var(--muted)]"
                >
                  No chat activity yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] bg-[var(--surface)] align-top hover:bg-[var(--surface-2)]"
                >
                  <Td className="whitespace-nowrap font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
                    {formatDate(r.createdAt)}
                    <span className="mt-1 block uppercase tracking-[0.1em] text-[var(--muted)]/70">
                      {r.locale}
                    </span>
                  </Td>
                  <Td>
                    <details className="group max-w-[560px]">
                      <summary className="cursor-pointer list-none font-sans text-[13px] font-medium text-[var(--text)] marker:hidden">
                        <span className="line-clamp-2 group-open:line-clamp-none">
                          {r.question || "—"}
                        </span>
                        <span className="mt-1 inline-block font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--accent)] group-open:hidden">
                          show answer ↓
                        </span>
                      </summary>
                      <div className="mt-3 border-l-2 border-[var(--accent)]/40 pl-3 text-[13px] font-light leading-[1.6] text-[var(--text-2)]">
                        <p className="whitespace-pre-wrap">
                          {r.answer || (
                            <span className="italic text-[var(--muted)]">
                              (no answer captured)
                            </span>
                          )}
                        </p>
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                          {r.model || "—"}
                        </p>
                      </div>
                    </details>
                  </Td>
                  <Td className="hidden md:table-cell font-mono text-[10px] tracking-[0.02em] text-[var(--muted)]">
                    {r.clientKeyHash.slice(0, 8)}
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <StatusPill status={r.status} />
                  </Td>
                  <Td className="text-right font-mono text-[11px] text-[var(--text-2)]">
                    {fmt(r.promptTokens + r.answerTokens)}
                    <span className="block text-[9px] text-[var(--muted)]">
                      {fmt(r.promptTokens)}+{fmt(r.answerTokens)}
                    </span>
                  </Td>
                  <Td className="hidden lg:table-cell text-right font-mono text-[10px] text-[var(--muted)]">
                    {r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <PageLink page={page - 1} disabled={page <= 1}>
            ← Newer
          </PageLink>
          <span className="font-mono text-[10px] tracking-[0.06em] text-[var(--muted)]">
            Page {page} of {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            Older →
          </PageLink>
        </div>
      ) : null}
    </AdminShell>
  );
}

function pick(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function Stat({
  label,
  value,
  hint,
  bar,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: number;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[1.4rem] font-bold leading-none tracking-tight text-[var(--text)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[9px] tracking-[0.04em] text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
      {typeof bar === "number" ? (
        <div className="mt-2 h-1 w-full bg-[var(--surface-2)]">
          <div
            className="h-1 bg-[var(--accent)]"
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ok"
      ? "border-[var(--green)]/40 text-[var(--green)] bg-[var(--green)]/10"
      : status === "error"
        ? "border-[var(--red)]/40 text-[var(--red)] bg-[var(--red)]/10"
        : status === "pending"
          ? "border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10"
          : "border-[var(--border-2)] text-[var(--muted)] bg-[var(--surface-2)]";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${tone}`}
    >
      {status}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="border border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/admin/chat?page=${page}`}
      className="border border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {children}
    </Link>
  );
}
