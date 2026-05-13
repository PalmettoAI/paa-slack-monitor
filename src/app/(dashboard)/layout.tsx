import Link from "next/link";

const NAV = [
  { href: "/", label: "Queue" },
  { href: "/threads", label: "Active Threads" },
  { href: "/sent", label: "Sent" },
  { href: "/workspaces", label: "Workspaces" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r border-ink/10 bg-white p-6 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center text-white font-bold">
            S
          </div>
          <div>
            <div className="text-sm font-semibold">PAA Slack Monitor</div>
            <div className="text-[11px] text-muted">community signal · drafts</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm hover:bg-ink/5">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 max-w-[212px]">
          <a href="/logout" className="text-[11px] text-muted hover:underline">
            Sign out
          </a>
        </div>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}
