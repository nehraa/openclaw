import { afterEach, describe, expect, it } from "vitest";
import {
  clearAllSubscriptions,
  getActiveSubscriptions,
  getSubscription,
  isSubscribed,
  subscribe,
  unsubscribe,
  updateSubscription,
} from "./subscriptions.js";

afterEach(() => {
  clearAllSubscriptions();
});

describe("subscribe", () => {
  it("should create a subscription", () => {
    const sub = subscribe("user1");
    expect(sub.userId).toBe("user1");
    expect(sub.optedIn).toBe(true);
    expect(sub.channels).toEqual(["in-app"]);
  });

  it("should accept custom options", () => {
    const sub = subscribe("user1", {
      channels: ["email", "webhook"],
      topicFilters: ["ai", "ml"],
      minRelevance: 0.5,
    });
    expect(sub.channels).toEqual(["email", "webhook"]);
    expect(sub.topicFilters).toEqual(["ai", "ml"]);
    expect(sub.minRelevance).toBe(0.5);
  });
});

describe("unsubscribe", () => {
  it("should opt out the user", () => {
    subscribe("user1");
    expect(isSubscribed("user1")).toBe(true);
    unsubscribe("user1");
    expect(isSubscribed("user1")).toBe(false);
  });

  it("should do nothing for unknown user", () => {
    unsubscribe("unknown"); // should not throw
  });
});

describe("isSubscribed", () => {
  it("should return false for unknown user", () => {
    expect(isSubscribed("unknown")).toBe(false);
  });
});

describe("getSubscription", () => {
  it("should return undefined for unknown user", () => {
    expect(getSubscription("unknown")).toBeUndefined();
  });

  it("should return a copy", () => {
    subscribe("user1");
    const s1 = getSubscription("user1");
    const s2 = getSubscription("user1");
    expect(s1).toEqual(s2);
    expect(s1).not.toBe(s2);
  });
});

describe("updateSubscription", () => {
  it("should update channels", () => {
    subscribe("user1");
    const updated = updateSubscription("user1", { channels: ["email"] });
    expect(updated!.channels).toEqual(["email"]);
  });

  it("should update topic filters", () => {
    subscribe("user1");
    const updated = updateSubscription("user1", { topicFilters: ["typescript"] });
    expect(updated!.topicFilters).toEqual(["typescript"]);
  });

  it("should return undefined for unknown user", () => {
    expect(updateSubscription("unknown", { channels: ["email"] })).toBeUndefined();
  });
});

describe("getActiveSubscriptions", () => {
  it("should return only opted-in subscriptions", () => {
    subscribe("user1");
    subscribe("user2");
    unsubscribe("user2");
    subscribe("user3");
    const active = getActiveSubscriptions();
    expect(active).toHaveLength(2);
    expect(active.map((s) => s.userId).sort()).toEqual(["user1", "user3"]);
  });
});
