import { afterEach, describe, expect, it } from "vitest";
import {
  clearAllNotifications,
  configureProactive,
  createNotification,
  getNotifications,
  markDelivered,
  markFailed,
} from "./notification-dispatcher.js";

afterEach(() => {
  clearAllNotifications();
  configureProactive({
    enabled: true,
    defaultMinRelevance: 0.3,
    maxDailyNotifications: 10,
    availableChannels: ["in-app"],
  });
});

describe("createNotification", () => {
  it("should create a notification", () => {
    const notif = createNotification("user1", {
      title: "New AI paper",
      body: "A great new paper on transformers",
      relevance: 0.8,
      topics: ["ai"],
    });
    expect(notif).toBeDefined();
    expect(notif!.userId).toBe("user1");
    expect(notif!.status).toBe("pending");
    expect(notif!.channel).toBe("in-app");
  });

  it("should return undefined when disabled", () => {
    configureProactive({ enabled: false });
    const notif = createNotification("user1", {
      title: "Test",
      body: "Test",
      relevance: 0.5,
      topics: [],
    });
    expect(notif).toBeUndefined();
  });

  it("should enforce daily rate limit", () => {
    configureProactive({ maxDailyNotifications: 2 });
    createNotification("user1", { title: "1", body: "1", relevance: 0.5, topics: [] });
    createNotification("user1", { title: "2", body: "2", relevance: 0.5, topics: [] });
    const third = createNotification("user1", {
      title: "3",
      body: "3",
      relevance: 0.5,
      topics: [],
    });
    expect(third).toBeUndefined();
  });

  it("should reject unavailable channels", () => {
    const notif = createNotification("user1", {
      title: "Test",
      body: "Test",
      relevance: 0.5,
      topics: [],
      channel: "email",
    });
    expect(notif).toBeUndefined();
  });

  it("should enforce defaultMinRelevance threshold", () => {
    configureProactive({ defaultMinRelevance: 0.5 });
    const below = createNotification("user1", {
      title: "Low",
      body: "Low relevance",
      relevance: 0.3,
      topics: [],
    });
    expect(below).toBeUndefined();

    const above = createNotification("user1", {
      title: "High",
      body: "High relevance",
      relevance: 0.6,
      topics: [],
    });
    expect(above).toBeDefined();
  });

  it("should deep-clone returned notification (mutation-safe)", () => {
    const notif = createNotification("user1", {
      title: "Test",
      body: "Test",
      relevance: 0.5,
      topics: ["ai"],
    });
    // Mutating returned object should not affect stored state
    notif!.topics.push("hacked");
    const stored = getNotifications("user1");
    expect(stored[0].topics).toEqual(["ai"]);
  });
});

describe("getNotifications", () => {
  it("should return empty for unknown user", () => {
    expect(getNotifications("unknown")).toEqual([]);
  });

  it("should filter by status", () => {
    createNotification("user1", { title: "1", body: "1", relevance: 0.5, topics: [] });
    const notif = createNotification("user1", {
      title: "2",
      body: "2",
      relevance: 0.5,
      topics: [],
    });
    markDelivered("user1", notif!.id);

    const pending = getNotifications("user1", { status: "pending" });
    expect(pending).toHaveLength(1);

    const delivered = getNotifications("user1", { status: "delivered" });
    expect(delivered).toHaveLength(1);
  });

  it("should respect limit", () => {
    for (let i = 0; i < 5; i++) {
      createNotification("user1", { title: `${i}`, body: `${i}`, relevance: 0.5, topics: [] });
    }
    const limited = getNotifications("user1", { limit: 2 });
    expect(limited).toHaveLength(2);
  });
});

describe("markDelivered", () => {
  it("should update status to delivered", () => {
    const notif = createNotification("user1", {
      title: "Test",
      body: "Test",
      relevance: 0.5,
      topics: [],
    });
    const result = markDelivered("user1", notif!.id);
    expect(result).toBe(true);
    const updated = getNotifications("user1", { status: "delivered" });
    expect(updated).toHaveLength(1);
  });

  it("should return false for unknown notification", () => {
    expect(markDelivered("user1", "unknown")).toBe(false);
  });
});

describe("markFailed", () => {
  it("should update status to failed", () => {
    const notif = createNotification("user1", {
      title: "Test",
      body: "Test",
      relevance: 0.5,
      topics: [],
    });
    const result = markFailed("user1", notif!.id);
    expect(result).toBe(true);
    const failed = getNotifications("user1", { status: "failed" });
    expect(failed).toHaveLength(1);
  });
});
