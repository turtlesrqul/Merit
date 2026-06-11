"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { ActionIcon, iconControlClassName } from "@/components/ui/action-icon";
import { getSupportEmail, getSupportUrl } from "@/lib/public-config";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string;
  roleType?: "candidate" | "recruiter" | null;
};

export function AppShell({ children, userEmail, roleType }: AppShellProps) {
  const supportEmail = getSupportEmail();
  const supportUrl = getSupportUrl();
  const pathname = usePathname();
  const router = useRouter();
  const isSignedIn = Boolean(userEmail);
  const dashboardNavItems = [
    { href: "/profile", label: "Dashboard" },
    { href: "/home", label: "Explore" },
    { href: "/people", label: "People" },
    { href: "/opportunities", label: "Opportunities" },
    ...(roleType === "recruiter" ? [{ href: "/recruiter", label: "Recruiter" }] : [])
  ];

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

  return (
    <div className="min-h-screen bg-[#f4f0e8] text-[#16130f]">
      <header className="sticky top-0 z-40 border-b border-[#d7cebd] bg-[#f4f0e8]/95 backdrop-blur-sm">
        <div className="editorial-wide flex min-h-16 items-center gap-5 py-3">
          <Link className="font-serif text-3xl italic leading-none text-[#f3c945]" href="/">
            Merit
          </Link>

          <nav className={cn("items-center gap-4 text-sm text-[#6f6658]", isSignedIn ? "hidden sm:flex" : "flex")}>
            {isSignedIn ? (
              <>
                <span className="h-7 border-l border-[#d7cebd]" />
                {dashboardNavItems.map((item) => (
                  <Link
                    className={cn(
                      "inline-flex transition-colors hover:text-[#16130f]",
                      pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`))
                        ? "text-[#16130f]"
                        : ""
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : (
              <Link className="transition-colors hover:text-[#16130f]" href="/home">
                Explore
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            {isSignedIn ? (
              <>
                <Link
                  aria-label="Add project"
                  className={iconControlClassName({ className: "h-12 w-12", variant: "primary" })}
                  href="/projects/new"
                  title="Add project"
                >
                  <ActionIcon name="plus" />
                </Link>
                <button className="text-[#16130f] hover:text-[#6f6658]" onClick={handleSignOut} type="button">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link className="text-[#16130f] hover:text-[#6f6658]" href="/sign-in">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        {isSignedIn ? (
          <nav className="editorial-wide flex gap-2 overflow-x-auto pb-3 text-sm text-[#6f6658] sm:hidden">
            {dashboardNavItems.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  className={cn(
                    "shrink-0 border px-3 py-1.5 transition-colors",
                    active
                      ? "border-[#f3c945] bg-[#f3c945] text-[#16130f]"
                      : "border-[#d7cebd] bg-[#fbf8f0] hover:text-[#16130f]"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <main className="page-fade">{children}</main>
      <footer className="mt-24 border-t border-[#d7cebd] bg-[#eee8dd]/70">
        <div className="editorial-wide flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-[#7b705f]">
          <p>Merit</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="hover:text-[#16130f]" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-[#16130f]" href="/privacy">
              Privacy
            </Link>
            <a
              className="hover:text-[#16130f]"
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
