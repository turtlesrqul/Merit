"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string;
  roleType?: "candidate" | "recruiter" | null;
};

const baseNavItems = [
  { href: "/home", label: "Discovery" },
  { href: "/people", label: "People" },
  { href: "/profile", label: "Profile" },
  { href: "/projects/new", label: "Add Project" },
  { href: "/opportunities", label: "Opportunities" }
];

export function AppShell({ children, userEmail, roleType }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState("");
  const navItems =
    roleType === "recruiter"
      ? [...baseNavItems, { href: "/recruiter", label: "Recruiter" }]
      : baseNavItems;
  const currentSearchQuery = searchParams.get("q") ?? "";

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  useEffect(() => {
    if (pathname.startsWith("/search")) {
      setGlobalQuery(currentSearchQuery);
    }
  }, [pathname, currentSearchQuery]);

  const handleGlobalSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = globalQuery.trim();
    if (!trimmedQuery) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-5">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-sun-500 bg-sun-400 text-lg font-semibold text-ink-950 shadow-sm">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-950">Merit</span>
          </Link>

          <div className="hidden flex-1 md:block">
            <form className="max-w-sm" onSubmit={handleGlobalSearch}>
              <Input
                aria-label="Global search"
                onChange={(event) => setGlobalQuery(event.target.value)}
                placeholder="Search users, projects, skills..."
                value={globalQuery}
              />
            </form>
          </div>

          <nav className="ml-auto flex items-center gap-1 rounded-xl border border-ink-100 bg-white/95 p-1">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-sun-50 hover:text-ink-900",
                  pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`))
                    ? "bg-sun-100 text-ink-950"
                    : ""
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {userEmail ? (
              <>
                <span className="max-w-[220px] truncate text-sm text-ink-600">{userEmail}</span>
                <Button onClick={handleSignOut} type="button" variant="secondary">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link className="text-sm font-semibold text-ink-900" href="/sign-in">
                  Sign in
                </Link>
                <Link className="text-sm font-semibold text-ink-900" href="/sign-up">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {userEmail ? (
            <Button className="sm:hidden" onClick={handleSignOut} type="button" variant="secondary">
              Sign out
            </Button>
          ) : null}
        </div>
      </header>
      <main className="page-fade mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-5 sm:py-8">{children}</main>
    </div>
  );
}
