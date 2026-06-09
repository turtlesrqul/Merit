"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupportEmail, getSupportUrl } from "@/lib/public-config";
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
  const supportEmail = getSupportEmail();
  const supportUrl = getSupportUrl();
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
    if (typeof window !== "undefined") {
      window.location.assign("/home");
      return;
    }
    router.replace("/home");
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
      <header className="sticky top-0 z-40 border-b border-[#e7dece] bg-[#f6f2e9]/92 backdrop-blur-md">
        <div className="mx-auto hidden max-w-[1720px] items-center justify-between px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.12em] text-[#7a6f5f] sm:flex">
          <p>Proof Over Pedigree</p>
          <p>Curated gallery of ambitious builders</p>
        </div>
        <div className="mx-auto flex max-w-[1720px] items-center gap-3 px-3 py-3 sm:px-4">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#e4bb35] bg-[#f4cf59] text-lg font-semibold text-[#171512] shadow-sm">
              M
            </span>
            <div>
              <span className="block text-xl font-semibold tracking-tight text-[#171512]">Merit</span>
              <span className="hidden text-[11px] uppercase tracking-[0.12em] text-[#7c715f] sm:block">Merit V3</span>
            </div>
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

          <nav className="ml-auto flex items-center gap-0.5 rounded-xl border border-[#dfd4c2] bg-[#fdfaf3] p-1">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-[#5c5242] transition-colors hover:bg-[#fff3cf] hover:text-[#1f1b15]",
                  pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`))
                    ? "bg-[#f4cf59] text-[#1d1913] shadow-[inset_0_-2px_0_0_rgba(228,187,53,0.95)]"
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
                <span className="max-w-[220px] truncate text-sm text-[#6b6356]">{userEmail}</span>
                <Button onClick={handleSignOut} type="button" variant="secondary">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link className="text-sm font-semibold text-[#25211b]" href="/sign-in">
                  Sign in
                </Link>
                <Link className="text-sm font-semibold text-[#25211b]" href="/sign-up">
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
      <main className="page-fade mx-auto w-full max-w-[1720px] px-3 py-6 sm:px-4 sm:py-8">{children}</main>
      <footer className="border-t border-[#e7dece] bg-[#f7f3ea]/75">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs text-[#6b6356] sm:px-4">
          <p>Merit Beta</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="underline decoration-[#d2b97e] underline-offset-4" href="/terms">
              Terms
            </Link>
            <Link className="underline decoration-[#d2b97e] underline-offset-4" href="/privacy">
              Privacy
            </Link>
            <a
              className="underline decoration-[#d2b97e] underline-offset-4"
              href={supportUrl}
              rel="noreferrer"
              target="_blank"
            >
              Support: {supportEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
