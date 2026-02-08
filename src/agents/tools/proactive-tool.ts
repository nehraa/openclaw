/**
 * Proactive tool – gives the agent access to the proactive notification system.
 *
 * Exposes subscriptions, notifications, and content filtering so the agent
 * can manage proactive engagement on behalf of users.
 */

import { Type } from "@sinclair/typebox";
import { getNotifications, markDelivered } from "../../proactive/notification-dispatcher.js";
import {
  subscribe,
  unsubscribe,
  getSubscription,
  isSubscribed,
  getActiveSubscriptions,
} from "../../proactive/subscriptions.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const PROACTIVE_ACTIONS = [
  "check_subscription",
  "subscribe",
  "unsubscribe",
  "get_notifications",
  "mark_delivered",
  "list_subscriptions",
] as const;

const ProactiveToolSchema = Type.Object({
  action: stringEnum(PROACTIVE_ACTIONS),
  user_id: Type.Optional(
    Type.String({ description: "User/sender ID. Defaults to current sender." }),
  ),
  topics: Type.Optional(
    Type.String({
      description: "Comma-separated list of topics to subscribe to (for subscribe action).",
    }),
  ),
  channels: Type.Optional(
    Type.String({
      description:
        "Comma-separated notification channels (for subscribe action). E.g. 'in_app,email'.",
    }),
  ),
  notification_id: Type.Optional(
    Type.String({ description: "Notification ID (for mark_delivered)." }),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Max results to return.", minimum: 1, maximum: 50 }),
  ),
});

type ProactiveToolOptions = {
  senderId?: string;
};

export function createProactiveTool(options?: ProactiveToolOptions): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "proactive",
    label: "Proactive Notifications",
    description: [
      "Manage proactive notifications and subscriptions for users.",
      "Actions: check_subscription (is user subscribed?), subscribe (opt-in to topics),",
      "unsubscribe (opt-out), get_notifications (pending notifications),",
      "mark_delivered (acknowledge), list_subscriptions (all active).",
    ].join(" "),
    parameters: ProactiveToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", {
        required: true,
      }) as (typeof PROACTIVE_ACTIONS)[number];
      const userId = (params.user_id as string) ?? options?.senderId ?? "unknown";

      try {
        switch (action) {
          case "check_subscription": {
            const subscribed = isSubscribed(userId);
            const subscription = subscribed ? getSubscription(userId) : undefined;
            return jsonResult({ userId, subscribed, subscription });
          }

          case "subscribe": {
            const topicsStr = (params.topics as string) ?? "";
            const topics = topicsStr
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            const channelsStr = (params.channels as string) ?? "in-app";
            const channels = channelsStr
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean);
            const sub = subscribe(userId, {
              topicFilters: topics,
              channels: channels as Array<"in-app" | "email" | "webhook">,
            });
            return jsonResult({ subscription: sub });
          }

          case "unsubscribe": {
            unsubscribe(userId);
            return jsonResult({ success: true, userId });
          }

          case "get_notifications": {
            const limit = (params.limit as number) ?? 10;
            const notifications = getNotifications(userId, { limit });
            return jsonResult({ userId, count: notifications.length, notifications });
          }

          case "mark_delivered": {
            const notifId = readStringParam(params, "notification_id", { required: true });
            const result = markDelivered(userId, notifId);
            return jsonResult({ success: result, notificationId: notifId });
          }

          case "list_subscriptions": {
            const subs = getActiveSubscriptions();
            return jsonResult({ count: subs.length, subscriptions: subs });
          }

          default:
            return jsonResult({ error: `Unknown action: ${String(action)}` });
        }
      } catch (err) {
        return jsonResult({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
  return tool;
}
