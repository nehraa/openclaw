import { describe, expect, it, beforeEach } from "vitest";
import { clearAllNotifications } from "../../proactive/notification-dispatcher.js";
import { clearAllSubscriptions } from "../../proactive/subscriptions.js";
import { createProactiveTool } from "./proactive-tool.js";

describe("proactive-tool", () => {
  beforeEach(() => {
    clearAllSubscriptions();
    clearAllNotifications();
  });

  it("creates a tool with correct name and label", () => {
    const tool = createProactiveTool();
    expect(tool.name).toBe("proactive");
    expect(tool.label).toBe("Proactive Notifications");
  });

  it("check_subscription returns not subscribed initially", async () => {
    const tool = createProactiveTool({ senderId: "user-1" });
    const result = await tool.execute("test-id", { action: "check_subscription" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.subscribed).toBe(false);
  });

  it("subscribe then check returns subscribed", async () => {
    const tool = createProactiveTool({ senderId: "user-1" });
    await tool.execute("test-id", {
      action: "subscribe",
      topics: "typescript,python",
      channels: "in-app",
    });

    const result = await tool.execute("test-id", { action: "check_subscription" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.subscribed).toBe(true);
    expect(parsed.subscription).toBeDefined();
  });

  it("unsubscribe works", async () => {
    const tool = createProactiveTool({ senderId: "user-1" });
    await tool.execute("test-id", { action: "subscribe" });
    const result = await tool.execute("test-id", { action: "unsubscribe" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.success).toBe(true);
  });

  it("get_notifications returns empty when none", async () => {
    const tool = createProactiveTool({ senderId: "user-1" });
    const result = await tool.execute("test-id", { action: "get_notifications" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBe(0);
    expect(parsed.notifications).toEqual([]);
  });

  it("list_subscriptions returns all active", async () => {
    const tool = createProactiveTool({ senderId: "user-1" });
    await tool.execute("test-id", { action: "subscribe" });
    const result = await tool.execute("test-id", { action: "list_subscriptions" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBeGreaterThanOrEqual(1);
  });
});
