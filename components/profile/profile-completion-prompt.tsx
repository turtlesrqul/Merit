import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProfileCompletionPromptProps = {
  score: number;
};

export function ProfileCompletionPrompt({ score }: ProfileCompletionPromptProps) {
  if (score >= 100) {
    return null;
  }

  return (
    <Card className="space-y-4 border-sun-200 bg-gradient-to-br from-sun-50 to-white">
      <h3 className="text-base font-semibold text-ink-950">Complete your profile</h3>
      <p className="text-sm text-ink-700">
        Recruiters trust complete, evidence-rich profiles. Add your profile details, resume, portfolio links, and project proof.
      </p>
      <div className="pt-1">
        <Link href="/profile">
          <Button className="w-full">Update profile</Button>
        </Link>
      </div>
    </Card>
  );
}
