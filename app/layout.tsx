import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { SupabaseSetupRequired } from "@/components/setup/supabase-setup-required";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-ui"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Merit",
  description: "Proof over pedigree"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${cormorant.variable}`}>
        {supabaseConfigured ? (
          <>
            <AuthSessionSync />
            {children}
          </>
        ) : (
          <SupabaseSetupRequired />
        )}
      </body>
    </html>
  );
}
