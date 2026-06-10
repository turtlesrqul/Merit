import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AuthVerifiedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[900px] items-center px-4 py-10">
      <Card className="mx-auto w-full max-w-xl space-y-4 border-[#ddcfac] bg-gradient-to-b from-[#fffdf9] to-[#f9f4ea]">
        <p className="inline-flex rounded-full border border-[#e0d3b6] bg-[#f6eddc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#5f574b]">
          Email confirmed
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171512]">Your account is verified.</h1>
        <p className="text-sm text-[#5e574c]">
          If you landed here from an older confirmation link, continue into Merit. New confirmation links should sign you in automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/home">
            <Button>Open home</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary">Go to sign in</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
