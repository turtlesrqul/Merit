import demoAccountsJson from "@/data/demo-accounts.json";

export type DemoArtifact = {
  url: string;
  type: string;
  previewUrl?: string;
};

export type DemoProject = {
  title: string;
  hook?: string;
  problemSolved: string;
  whatWasBuilt: string;
  category: string;
  projectType?: "web" | "design" | "document" | "other";
  coverImageUrl?: string;
  isFeatured?: boolean;
  impact: string;
  skills: string[];
  artifacts: DemoArtifact[];
};

export type DemoOpportunity = {
  title: string;
  company: string;
  description: string;
  skillsSought: string[];
};

export type DemoAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  roleType: "candidate" | "recruiter";
  headline: string;
  bio: string;
  contactEmail: string;
  targetRoles: string[];
  portfolioLinks: string[];
  projects: DemoProject[];
  opportunities?: DemoOpportunity[];
};

export const DEMO_ACCOUNTS = demoAccountsJson as DemoAccount[];

export function getDemoAccountById(accountId?: string) {
  if (!accountId) {
    return null;
  }
  return DEMO_ACCOUNTS.find((account) => account.id === accountId) ?? null;
}
