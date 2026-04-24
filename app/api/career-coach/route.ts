import { NextResponse } from "next/server";

type CareerCoachRequest = {
  profile: {
    headline: string;
    targetRoles: string[];
    bio: string;
  };
  projects: Array<{
    title: string;
    category: string;
    skills: string[];
    impact: string | null;
    artifactCount: number;
  }>;
  question?: string;
  history?: Array<{
    role: "user" | "coach";
    message: string;
  }>;
};

type CareerCoachResponse = {
  suggestedProjects: string[];
  missingSignals: string[];
  examples: string[];
  source: "openai" | "rules";
};

type CareerCoachChatResponse = {
  reply: string;
  source: "openai" | "rules";
};

const AI_TOKENS = ["ai", "llm", "automation", "prompt", "gpt", "agent", "machine learning", "ml"];
const ENGINEERING_TOKENS = [
  "engineering",
  "engineer",
  "systems engineering",
  "mechanical",
  "electrical",
  "civil",
  "chemical",
  "industrial",
  "autocad",
  "cad",
  "solidworks",
  "simulation",
  "matlab",
  "reliability",
  "embedded",
  "iot",
  "sensor"
];
const DESIGN_TOKENS = [
  "product design",
  "ux design",
  "ui design",
  "designer",
  "figma",
  "prototyping",
  "prototype",
  "interaction design",
  "design system",
  "design systems",
  "usability",
  "ux research",
  "visual hierarchy",
  "wireframe"
];
const DATA_TOKENS = ["data", "analyst", "sql", "analytics", "dashboard", "dbt", "visualization"];
const FRONTEND_TOKENS = ["frontend", "react", "next.js", "accessibility", "ui", "web app"];
const BACKEND_TOKENS = ["backend", "platform", "api", "postgres", "database", "infra", "cloud"];

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

type CoachFocus =
  | "engineering"
  | "design"
  | "data"
  | "frontend"
  | "backend"
  | "software-general";

function normalize(values: string[]) {
  return unique(values.map((value) => value.toLowerCase()));
}

function containsAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function countTokenHits(text: string, tokens: string[]) {
  return tokens.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
}

function detectFocus(input: CareerCoachRequest): CoachFocus {
  const roleText = [
    input.profile.headline,
    input.profile.bio,
    input.profile.targetRoles.join(" "),
    input.projects.map((project) => `${project.title} ${project.category}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();

  const skillsText = normalize(input.projects.flatMap((project) => project.skills)).join(" ");
  const categoryText = normalize(input.projects.map((project) => project.category)).join(" ");
  const corpus = `${roleText} ${skillsText} ${categoryText}`;

  const engineeringScore =
    countTokenHits(roleText, ENGINEERING_TOKENS) * 3 +
    countTokenHits(skillsText, ENGINEERING_TOKENS) * 2 +
    countTokenHits(categoryText, ENGINEERING_TOKENS);
  const designScore =
    countTokenHits(roleText, DESIGN_TOKENS) * 3 +
    countTokenHits(skillsText, DESIGN_TOKENS) * 2 +
    countTokenHits(categoryText, DESIGN_TOKENS);
  const dataScore =
    countTokenHits(roleText, DATA_TOKENS) * 2 +
    countTokenHits(skillsText, DATA_TOKENS) * 2 +
    countTokenHits(categoryText, DATA_TOKENS);
  const frontendScore =
    countTokenHits(roleText, FRONTEND_TOKENS) * 2 +
    countTokenHits(skillsText, FRONTEND_TOKENS) * 2 +
    countTokenHits(categoryText, FRONTEND_TOKENS);
  const backendScore =
    countTokenHits(roleText, BACKEND_TOKENS) * 2 +
    countTokenHits(skillsText, BACKEND_TOKENS) * 2 +
    countTokenHits(categoryText, BACKEND_TOKENS);

  const scoreCard = [
    { focus: "engineering" as CoachFocus, score: engineeringScore },
    { focus: "design" as CoachFocus, score: designScore },
    { focus: "data" as CoachFocus, score: dataScore },
    { focus: "frontend" as CoachFocus, score: frontendScore },
    { focus: "backend" as CoachFocus, score: backendScore }
  ].sort((a, b) => b.score - a.score);

  const top = scoreCard[0];
  const next = scoreCard[1];

  // Require minimum signal and separation to avoid noisy flips.
  if (top.score >= 2 && top.score >= next.score + 1) {
    return top.focus;
  }

  if (containsAnyToken(corpus, ENGINEERING_TOKENS)) {
    return "engineering";
  }
  if (containsAnyToken(corpus, DESIGN_TOKENS)) {
    return "design";
  }
  if (containsAnyToken(corpus, DATA_TOKENS)) {
    return "data";
  }
  if (containsAnyToken(corpus, FRONTEND_TOKENS)) {
    return "frontend";
  }
  if (containsAnyToken(corpus, BACKEND_TOKENS)) {
    return "backend";
  }

  return "software-general";
}

type CoachSignals = {
  focus: CoachFocus;
  normalizedSkills: string[];
  displaySkills: string[];
  categories: string[];
  roleText: string;
  hasAiSignals: boolean;
};

function deriveSignals(input: CareerCoachRequest): CoachSignals {
  const displaySkills = unique(input.projects.flatMap((project) => project.skills));
  const normalizedSkills = normalize(displaySkills);
  const categories = normalize(input.projects.map((project) => project.category));
  const roleText = [input.profile.headline, input.profile.bio, ...input.profile.targetRoles]
    .join(" ")
    .toLowerCase();
  const hasAiSignals =
    containsAnyToken(roleText, AI_TOKENS) || normalizedSkills.some((skill) => containsAnyToken(skill, AI_TOKENS));

  return {
    focus: detectFocus(input),
    normalizedSkills,
    displaySkills,
    categories,
    roleText,
    hasAiSignals
  };
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return unique(value.filter((entry): entry is string => typeof entry === "string"));
}

function parseJsonFromResponse(outputText: string): Record<string, unknown> | null {
  const cleaned = outputText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const objectText = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(objectText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sanitizeAdvice(items: string[], allowAiAdvice: boolean): string[] {
  const normalizedItems = unique(items);
  if (allowAiAdvice) {
    return normalizedItems;
  }
  return normalizedItems.filter((item) => !containsAnyToken(item.toLowerCase(), AI_TOKENS));
}

function isAdviceFocusMismatch(focus: CoachFocus, content: string) {
  const normalized = content.toLowerCase();
  const engineeringHits = countTokenHits(normalized, ENGINEERING_TOKENS);
  const designHits = countTokenHits(normalized, DESIGN_TOKENS);

  if (focus === "engineering") {
    return designHits >= 2 && engineeringHits < 2;
  }
  if (focus === "design") {
    return engineeringHits >= 2 && designHits < 2;
  }

  return false;
}

function buildRulesFallback(input: CareerCoachRequest): CareerCoachResponse {
  const signals = deriveSignals(input);
  const allSkills = signals.normalizedSkills;
  const anchorSkills = signals.displaySkills.slice(0, 3);
  const hasImpact = input.projects.some((project) => (project.impact ?? "").trim().length > 0);
  const hasArtifacts = input.projects.some((project) => project.artifactCount > 0);
  const focus = signals.focus;
  const roleSnapshot = unique(input.profile.targetRoles).slice(0, 2).join(", ");
  const roleHint = roleSnapshot ? ` for ${roleSnapshot}` : "";
  const skillsHint = anchorSkills.length > 0 ? ` using ${anchorSkills.join(", ")}` : "";

  const missingSignals: string[] = [];
  if (!hasImpact) {
    missingSignals.push("Quantified impact is missing from most projects.");
  }
  if (!hasArtifacts) {
    missingSignals.push("Evidence artifacts are missing or too sparse.");
  }
  if (allSkills.length < 4) {
    missingSignals.push("Skill coverage is narrow; show breadth across execution and delivery.");
  }
  if (input.projects.length < 3) {
    missingSignals.push("Project volume is low; publish at least 3 strong proof cards.");
  }

  if (focus === "engineering") {
    if (!allSkills.some((skill) => skill.includes("simulation") || skill.includes("matlab"))) {
      missingSignals.push("Add simulation/modeling evidence (e.g., MATLAB/CAE comparison).");
    }
    if (!allSkills.some((skill) => skill.includes("testing") || skill.includes("reliability"))) {
      missingSignals.push("Show validation or reliability testing methodology.");
    }
    if (!allSkills.some((skill) => skill.includes("cad") || skill.includes("autocad") || skill.includes("solidworks"))) {
      missingSignals.push("Include CAD or technical drawing artifacts to support engineering depth.");
    }
  }

  if (focus === "design") {
    if (!allSkills.some((skill) => skill.includes("research") || skill.includes("interview"))) {
      missingSignals.push("Add user research outputs (interviews, insights, decision criteria).");
    }
    if (!allSkills.some((skill) => skill.includes("figma") || skill.includes("prototype"))) {
      missingSignals.push("Show a clickable prototype flow with rationale for major decisions.");
    }
  }

  if (focus === "data") {
    if (!allSkills.some((skill) => skill.includes("sql") || skill.includes("python"))) {
      missingSignals.push("Add SQL/Python evidence to strengthen analyst readiness.");
    }
    if (!allSkills.some((skill) => skill.includes("dashboard") || skill.includes("visual"))) {
      missingSignals.push("Include a decision-facing dashboard with clear business interpretation.");
    }
  }

  const suggestedProjects: string[] = [];
  if (focus === "frontend") {
    suggestedProjects.push(
      `Ship a production-like frontend app${roleHint}${skillsHint}, with accessibility audit and performance budget.`
    );
    suggestedProjects.push(
      "Publish a UI quality sprint: baseline Lighthouse metrics, fixes, and measurable improvements."
    );
  } else if (focus === "data") {
    suggestedProjects.push(
      `Build an end-to-end analytics case study${roleHint}${skillsHint}: ingestion, dashboard, and decision memo.`
    );
    suggestedProjects.push(
      "Create a forecasting or anomaly project with backtesting and clear model limitations."
    );
  } else if (focus === "engineering") {
    suggestedProjects.push(
      `Build an engineering validation project${skillsHint} linking CAD/simulation assumptions to physical test outcomes.`
    );
    suggestedProjects.push(
      "Ship a reliability improvement case with failure-mode analysis, test protocol, and quantified improvement."
    );
    suggestedProjects.push(
      "Create a systems integration project (sensor/embedded/dashboard) with measurable performance constraints."
    );
  } else if (focus === "design") {
    suggestedProjects.push(
      "Publish a full design case study with research synthesis, prototypes, and usability findings."
    );
    suggestedProjects.push(
      "Create a reusable component system with accessibility states and documented design decisions."
    );
  } else if (focus === "backend") {
    suggestedProjects.push(
      `Build a backend service${roleHint}${skillsHint} with clear API contracts, observability, and SLA targets.`
    );
    suggestedProjects.push(
      "Publish a scaling case: bottleneck diagnosis, optimization steps, and before/after latency metrics."
    );
  } else {
    suggestedProjects.push(
      `Create a collaboration project${roleHint} with ownership proof (PRs, design docs, launch metrics).`
    );
    suggestedProjects.push("Publish one project with quantified user or stakeholder impact.");
  }

  if (signals.hasAiSignals) {
    suggestedProjects.push("Build a scoped AI workflow and document measurable time saved or quality gains.");
  }

  return {
    suggestedProjects: sanitizeAdvice(suggestedProjects, signals.hasAiSignals).slice(0, 4),
    missingSignals: unique(missingSignals).slice(0, 4),
    examples:
      focus === "engineering"
        ? [
            "Simulation vs prototype comparison with error analysis and design iteration log.",
            "Failure analysis report with test matrix and reliability metrics.",
            "Embedded + dashboard project with latency, stability, and energy constraints."
          ]
        : focus === "design"
          ? [
              "User research to high-fidelity redesign with usability test outcomes.",
              "Design system rollout with component governance and accessibility checks.",
              "Portfolio case study showing problem framing, tradeoffs, and impact."
            ]
          : [
              "Intern-ready product teardown + redesign with before/after KPI hypotheses.",
              "API integration project with reliability monitoring and incident postmortem.",
              "Growth experiment report with baseline, experiment design, and result interpretation."
            ],
    source: "rules"
  };
}

async function runOpenAiCoach(input: CareerCoachRequest): Promise<CareerCoachResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const signals = deriveSignals(input);
  const focus = signals.focus;
  const systemPrompt =
    "You are Merit Career Coach. Return strict JSON object with keys suggestedProjects (string[]), missingSignals (string[]), examples (string[]). Every suggestedProjects item must reference actual candidate context (specific role, skill tag, or project category from the input). Keep advice concise and internship-ready. Avoid generic filler. Respect the detected focus exactly. If focus is engineering, avoid design-student suggestions. If focus is design, avoid engineering-student suggestions. Do not mention AI/automation unless the candidate's profile explicitly includes AI/automation signals. No markdown, no code fences.";

  const userPrompt = `Detected focus: ${focus}
Has AI signals: ${signals.hasAiSignals ? "yes" : "no"}
Primary skill tags: ${signals.displaySkills.slice(0, 8).join(", ") || "none"}
Project categories: ${signals.categories.join(", ") || "none"}
Profile: ${JSON.stringify(input.profile)}
Projects: ${JSON.stringify(input.projects)}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_output_tokens: 500,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = typeof payload.output_text === "string" ? payload.output_text : "";
  if (!outputText) {
    return null;
  }

  const parsed = parseJsonFromResponse(outputText);
  if (!parsed) {
    return null;
  }

  const suggestedProjects = sanitizeAdvice(
    safeStringArray(parsed.suggestedProjects),
    signals.hasAiSignals
  ).slice(0, 5);
  const missingSignals = safeStringArray(parsed.missingSignals).slice(0, 5);
  const examples = sanitizeAdvice(safeStringArray(parsed.examples), signals.hasAiSignals).slice(0, 5);

  if (suggestedProjects.length === 0) {
    return null;
  }

  const combinedAdviceText = [...suggestedProjects, ...missingSignals, ...examples].join(" ");
  if (isAdviceFocusMismatch(focus, combinedAdviceText)) {
    return null;
  }

  return {
    suggestedProjects,
    missingSignals,
    examples,
    source: "openai"
  };
}

async function runOpenAiCoachChat(input: CareerCoachRequest): Promise<CareerCoachChatResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !input.question) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const signals = deriveSignals(input);
  const focus = signals.focus;
  const historyText = (input.history ?? [])
    .slice(-8)
    .map((turn) => `${turn.role}: ${turn.message}`)
    .join("\n");
  const question = input.question.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content:
            "You are Merit Career Coach. Give direct, personalized elaboration grounded in the user's actual profile, target roles, and project skill tags. Keep it practical, specific, and concise. Do not mention AI/automation unless the user's profile explicitly includes AI/automation signals or the user asks for it. No markdown."
        },
        {
          role: "user",
          content: `Focus: ${focus}
Has AI signals: ${signals.hasAiSignals ? "yes" : "no"}
Primary skill tags: ${signals.displaySkills.slice(0, 8).join(", ") || "none"}
Profile: ${JSON.stringify(input.profile)}
Projects: ${JSON.stringify(input.projects)}
Recent chat:
${historyText}
User question: ${question}`
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = typeof payload.output_text === "string" ? payload.output_text.trim() : "";
  if (!outputText) {
    return null;
  }

  if (
    !signals.hasAiSignals &&
    !containsAnyToken(question.toLowerCase(), AI_TOKENS) &&
    containsAnyToken(outputText.toLowerCase(), AI_TOKENS)
  ) {
    return null;
  }
  if (isAdviceFocusMismatch(focus, outputText)) {
    return null;
  }

  return {
    reply: outputText,
    source: "openai"
  };
}

function buildRulesChatFallback(input: CareerCoachRequest): CareerCoachChatResponse {
  const fallback = buildRulesFallback(input);
  const signals = deriveSignals(input);
  const topSkills = signals.displaySkills.slice(0, 6);
  const questionPrefix = input.question ? `On "${input.question.trim()}": ` : "";
  const responseLines = [
    `${questionPrefix}Based on your ${signals.focus} profile, prioritize proof that shows measurable outcomes.`,
    fallback.suggestedProjects[0] ? `Best next project: ${fallback.suggestedProjects[0]}` : "",
    fallback.missingSignals.length > 0
      ? `Main gap to fix next: ${fallback.missingSignals[0]}`
      : "Main gap to fix next: tighten your evidence with stronger metrics and artifacts.",
    topSkills.length > 0
      ? `Lean into these strengths from your tags: ${topSkills.join(", ")}.`
      : "Add explicit skill tags so recommendations can be more targeted."
  ].filter(Boolean);

  return {
    reply: responseLines.join(" "),
    source: "rules"
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CareerCoachRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.question && body.question.trim().length > 0) {
    const chatResponse = (await runOpenAiCoachChat(body)) ?? buildRulesChatFallback(body);
    return NextResponse.json(chatResponse);
  }

  const fallback = buildRulesFallback(body);
  const openAiResult = await runOpenAiCoach(body);
  const result = openAiResult ?? fallback;

  return NextResponse.json(result);
}
