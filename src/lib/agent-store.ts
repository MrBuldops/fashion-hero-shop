import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { Redis } from "@upstash/redis";

// Server-side shared store for the Wizard of Oz "AI Growth Partner Agent" test.
// Seller and analyst are two different browsers, so this cannot live in
// localStorage — it needs a server-side store shared across requests.
//
// Two backends, chosen at runtime:
//   • Upstash Redis  — used in production (Vercel serverless), where the
//     filesystem is ephemeral/per-instance and a JSON file would not be shared.
//     Enabled when the Upstash/KV REST env vars are present.
//   • JSON file      — used for local dev (zero setup), survives dev restarts.

export type MessageRole = "seller" | "analyst";

export interface AgentMessage {
  id: string;
  role: MessageRole;
  text: string;
  ts: number;
}

export interface SurveyResponse {
  messageId: string;
  helpful: boolean;
  willImplement: boolean;
  ts: number;
}

export interface Conversation {
  sellerId: string;
  sellerName: string;
  messages: AgentMessage[];
  surveys: SurveyResponse[];
}

interface StoreShape {
  conversations: Record<string, Conversation>;
}

// ── backend selection ───────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const SELLERS_KEY = "agent:sellers";
const convKey = (sellerId: string) => `agent:conv:${sellerId}`;

function newConversation(sellerId: string, sellerName: string): Conversation {
  return { sellerId, sellerName, messages: [], surveys: [] };
}

function newMessage(role: MessageRole, text: string): AgentMessage {
  return { id: crypto.randomUUID(), role, text: text.trim(), ts: Date.now() };
}

function byLastMessage(a: Conversation, b: Conversation): number {
  return (b.messages.at(-1)?.ts ?? 0) - (a.messages.at(-1)?.ts ?? 0);
}

// ── file backend (local dev) ────────────────────────────────────────────────

const STORE_PATH = join(process.cwd(), ".data", "agent-conversations.json");

async function readFileStore(): Promise<StoreShape> {
  try {
    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8")) as StoreShape;
    return parsed.conversations ? parsed : { conversations: {} };
  } catch {
    return { conversations: {} };
  }
}

async function writeFileStore(store: StoreShape): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

// ── public API (dispatches to whichever backend is active) ───────────────────

export async function listConversations(): Promise<Conversation[]> {
  const redis = getRedis();
  if (redis) {
    const ids = await redis.smembers(SELLERS_KEY);
    if (!ids.length) return [];
    const convs = await Promise.all(
      ids.map((id) => redis.get<Conversation>(convKey(id))),
    );
    return convs.filter((c): c is Conversation => Boolean(c)).sort(byLastMessage);
  }
  const store = await readFileStore();
  return Object.values(store.conversations).sort(byLastMessage);
}

export async function getConversation(
  sellerId: string,
): Promise<Conversation | null> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<Conversation>(convKey(sellerId))) ?? null;
  }
  const store = await readFileStore();
  return store.conversations[sellerId] ?? null;
}

export async function appendMessage(
  sellerId: string,
  sellerName: string,
  role: MessageRole,
  text: string,
): Promise<AgentMessage> {
  const message = newMessage(role, text);
  const redis = getRedis();
  if (redis) {
    const existing = await redis.get<Conversation>(convKey(sellerId));
    const conversation = existing ?? newConversation(sellerId, sellerName);
    if (sellerName) conversation.sellerName = sellerName;
    conversation.messages.push(message);
    await redis.set(convKey(sellerId), conversation);
    await redis.sadd(SELLERS_KEY, sellerId);
    return message;
  }
  const store = await readFileStore();
  const conversation =
    store.conversations[sellerId] ?? newConversation(sellerId, sellerName);
  if (sellerName) conversation.sellerName = sellerName;
  conversation.messages.push(message);
  store.conversations[sellerId] = conversation;
  await writeFileStore(store);
  return message;
}

export async function resetAll(): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const ids = await redis.smembers(SELLERS_KEY);
    if (ids.length) await redis.del(...ids.map(convKey));
    await redis.del(SELLERS_KEY);
    return ids.length;
  }
  const store = await readFileStore();
  const count = Object.keys(store.conversations).length;
  await writeFileStore({ conversations: {} });
  return count;
}

export async function addSurvey(
  sellerId: string,
  messageId: string,
  helpful: boolean,
  willImplement: boolean,
): Promise<SurveyResponse | null> {
  const survey: SurveyResponse = {
    messageId,
    helpful,
    willImplement,
    ts: Date.now(),
  };
  const redis = getRedis();
  if (redis) {
    const conversation = await redis.get<Conversation>(convKey(sellerId));
    if (!conversation) return null;
    const existing = conversation.surveys.find((s) => s.messageId === messageId);
    if (existing) return existing;
    conversation.surveys.push(survey);
    await redis.set(convKey(sellerId), conversation);
    return survey;
  }
  const store = await readFileStore();
  const conversation = store.conversations[sellerId];
  if (!conversation) return null;
  const existing = conversation.surveys.find((s) => s.messageId === messageId);
  if (existing) return existing;
  conversation.surveys.push(survey);
  await writeFileStore(store);
  return survey;
}
