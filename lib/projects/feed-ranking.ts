export type FeedLabel = "Featured" | "Trending" | "New" | null;

export type RankableProject = {
  projectId: string;
  createdAt: string;
  isFeatured: boolean;
  engagement: {
    likes: number;
    saves: number;
    views: number;
  };
};

export function calculateTrendingScore(input: RankableProject["engagement"]) {
  return input.likes * 3 + input.saves * 2 + input.views;
}

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecent(createdAt: string, nowMs: number) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return nowMs - toTimestamp(createdAt) <= sevenDaysMs;
}

function sortByRecencyDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
}

export function rankProjectsForDiscovery<T extends RankableProject>(
  projects: T[],
  now = new Date()
): Array<T & { feedLabel: FeedLabel; trendingScore: number }> {
  const nowMs = now.getTime();
  const withScore = projects.map((project) => ({
    ...project,
    trendingScore: calculateTrendingScore(project.engagement)
  }));

  const featured = sortByRecencyDesc(withScore.filter((project) => project.isFeatured)).map((project) => ({
    ...project,
    feedLabel: "Featured" as const
  }));
  const featuredIds = new Set(featured.map((project) => project.projectId));

  const remainingAfterFeatured = withScore.filter((project) => !featuredIds.has(project.projectId));

  const trending = [...remainingAfterFeatured]
    .filter((project) => project.trendingScore > 0)
    .sort((a, b) => {
      if (b.trendingScore !== a.trendingScore) {
        return b.trendingScore - a.trendingScore;
      }
      return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
    })
    .map((project) => ({
      ...project,
      feedLabel: "Trending" as const
    }));
  const trendingIds = new Set(trending.map((project) => project.projectId));

  const remainingAfterTrending = remainingAfterFeatured.filter((project) => !trendingIds.has(project.projectId));

  const newest = sortByRecencyDesc(
    remainingAfterTrending.filter((project) => isRecent(project.createdAt, nowMs))
  ).map((project) => ({
    ...project,
    feedLabel: "New" as const
  }));
  const newIds = new Set(newest.map((project) => project.projectId));

  const remaining = sortByRecencyDesc(
    remainingAfterTrending.filter((project) => !newIds.has(project.projectId))
  ).map((project) => ({
    ...project,
    feedLabel: null
  }));

  return [...featured, ...trending, ...newest, ...remaining];
}
