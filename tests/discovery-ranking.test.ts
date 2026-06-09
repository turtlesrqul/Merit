import { describe, expect, it } from "vitest";
import { calculateTrendingScore, rankProjectsForDiscovery } from "@/lib/projects/feed-ranking";

describe("discovery ranking", () => {
  it("prioritizes featured projects first", () => {
    const projects = rankProjectsForDiscovery([
      {
        projectId: "new-trending",
        createdAt: "2026-05-03T12:00:00.000Z",
        isFeatured: false,
        engagement: { likes: 5, saves: 2, views: 10 }
      },
      {
        projectId: "featured-old",
        createdAt: "2026-01-01T12:00:00.000Z",
        isFeatured: true,
        engagement: { likes: 0, saves: 0, views: 1 }
      },
      {
        projectId: "featured-new",
        createdAt: "2026-05-01T12:00:00.000Z",
        isFeatured: true,
        engagement: { likes: 0, saves: 0, views: 2 }
      }
    ]);

    expect(projects[0].projectId).toBe("featured-new");
    expect(projects[0].feedLabel).toBe("Featured");
    expect(projects[1].projectId).toBe("featured-old");
    expect(projects[1].feedLabel).toBe("Featured");
  });

  it("uses engagement score for trending order", () => {
    const projects = rankProjectsForDiscovery(
      [
        {
          projectId: "higher-score",
          createdAt: "2026-05-01T12:00:00.000Z",
          isFeatured: false,
          engagement: { likes: 2, saves: 2, views: 4 }
        },
        {
          projectId: "lower-score",
          createdAt: "2026-05-02T12:00:00.000Z",
          isFeatured: false,
          engagement: { likes: 1, saves: 0, views: 2 }
        }
      ],
      new Date("2026-05-05T12:00:00.000Z")
    );

    expect(projects[0].projectId).toBe("higher-score");
    expect(projects[0].feedLabel).toBe("Trending");
    expect(projects[1].feedLabel).toBe("Trending");
  });

  it("labels recent zero-engagement projects as new", () => {
    const projects = rankProjectsForDiscovery(
      [
        {
          projectId: "recent",
          createdAt: "2026-05-04T12:00:00.000Z",
          isFeatured: false,
          engagement: { likes: 0, saves: 0, views: 0 }
        },
        {
          projectId: "older",
          createdAt: "2026-04-01T12:00:00.000Z",
          isFeatured: false,
          engagement: { likes: 0, saves: 0, views: 0 }
        }
      ],
      new Date("2026-05-05T12:00:00.000Z")
    );

    expect(projects[0].projectId).toBe("recent");
    expect(projects[0].feedLabel).toBe("New");
    expect(projects[1].feedLabel).toBe(null);
  });

  it("calculates trending score with weighted engagement", () => {
    expect(calculateTrendingScore({ likes: 2, saves: 3, views: 4 })).toBe(16);
  });
});
