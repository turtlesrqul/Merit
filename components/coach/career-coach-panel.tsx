"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CoachProjectInput = {
  title: string;
  category: string;
  skills: string[];
  impact: string | null;
  artifactCount: number;
};

type CareerCoachPanelProps = {
  profile: {
    headline: string;
    targetRoles: string[];
    bio: string;
  };
  projects: CoachProjectInput[];
};

type CoachResponse = {
  suggestedProjects: string[];
  missingSignals: string[];
  examples: string[];
  source: "openai" | "rules";
};

type CoachChatResponse = {
  reply: string;
  source: "openai" | "rules";
};

type ChatTurn = {
  role: "user" | "coach";
  message: string;
};

const STARTER_PROMPTS = [
  "What should I build next to improve my profile?",
  "How can I make my current projects look stronger to recruiters?",
  "What specific gaps should I fix this week?"
];

export function CareerCoachPanel({ profile, projects }: CareerCoachPanelProps) {
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSource, setChatSource] = useState<"openai" | "rules" | null>(null);

  const payload = useMemo(
    () => ({
      profile,
      projects
    }),
    [profile, projects]
  );

  const fetchCoach = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/career-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = (await response.json()) as CoachResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load coach recommendations.");
      }
      setResult(body);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load coach recommendations.");
    } finally {
      setIsLoading(false);
    }
  };

  const askCoach = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isChatLoading) {
      return;
    }

    const userTurn: ChatTurn = {
      role: "user",
      message: trimmedQuestion
    };
    const historyForRequest = [...chatHistory, userTurn];

    setChatHistory(historyForRequest);
    setChatInput("");
    setChatErrorMessage(null);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/career-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          question: trimmedQuestion,
          history: historyForRequest
        })
      });

      const body = (await response.json()) as CoachChatResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to get coach response.");
      }

      setChatSource(body.source);
      setChatHistory((previous) => [
        ...previous,
        {
          role: "coach",
          message: body.reply
        }
      ]);
    } catch (error) {
      setChatErrorMessage(error instanceof Error ? error.message : "Failed to get coach response.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const onChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await askCoach(chatInput);
  };

  useEffect(() => {
    fetchCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="space-y-3 border-sun-200 bg-gradient-to-br from-sun-50 to-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink-950">Career Coach</h3>
          <p className="text-xs text-ink-600">
            {result?.source === "openai" ? "AI-guided recommendations" : "Rules-based recommendations"}
          </p>
        </div>
        <Button onClick={fetchCoach} variant="secondary">
          Refresh
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-ink-700">Analyzing your proof profile...</p> : null}
      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

      {result ? (
        <div className="space-y-3 text-sm text-ink-700">
          <div>
            <p className="font-semibold text-ink-900">Suggested projects</p>
            <ul className="list-disc space-y-1 pl-5">
              {result.suggestedProjects.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-ink-900">Missing signals</p>
            <ul className="list-disc space-y-1 pl-5">
              {result.missingSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-ink-900">Strong example patterns</p>
            <ul className="list-disc space-y-1 pl-5">
              {result.examples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-sun-200/70 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink-900">Ask Career Coach</p>
            <p className="text-xs text-ink-600">
              Ask for elaboration on projects, gaps, and next steps.
              {chatSource ? ` Replies: ${chatSource === "openai" ? "AI-guided" : "Rules-based"}.` : ""}
            </p>
          </div>
        </div>

        {chatHistory.length === 0 ? (
          <div className="rounded-xl border border-sun-200 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Starter prompts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <Button key={prompt} disabled={isChatLoading} onClick={() => askCoach(prompt)} variant="secondary">
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-sun-200 bg-white/80 p-3">
            {chatHistory.map((turn, index) => (
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  turn.role === "user"
                    ? "ml-auto bg-sun-200/80 text-ink-950"
                    : "mr-auto bg-ink-50 text-ink-800"
                }`}
                key={`${turn.role}-${index}-${turn.message.slice(0, 24)}`}
              >
                {turn.message}
              </div>
            ))}
            {isChatLoading ? <p className="text-xs text-ink-600">Coach is thinking...</p> : null}
          </div>
        )}

        {chatErrorMessage ? <p className="text-sm text-red-700">{chatErrorMessage}</p> : null}

        <form className="flex gap-2" onSubmit={onChatSubmit}>
          <Input
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask for details about your next best project..."
            value={chatInput}
          />
          <Button disabled={isChatLoading || chatInput.trim().length === 0} type="submit">
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
