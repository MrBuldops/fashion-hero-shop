import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Server-side shared store for the Wizard of Oz "AI Growth Partner Agent" test.
// Seller and analyst are two different browsers, so this cannot live in
// localStorage — it needs a server-side store. A single JSON file is enough
// for a low-traffic concierge test and survives dev-server restarts.

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

const STORE_PATH = join(process.cwd(), ".data", "agent-conversations.json");

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.conversations) return { conversations: {} };
    return parsed;
  } catch {
    // Missing or unreadable file → start empty.
    return { conversations: {} };
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listConversations(): Promise<Conversation[]> {
  const store = await readStore();
  return Object.values(store.conversations).sort((a, b) => {
    const aLast = a.messages.at(-1)?.ts ?? 0;
    const bLast = b.messages.at(-1)?.ts ?? 0;
    return bLast - aLast;
  });
}

export async function getConversation(
  sellerId: string,
): Promise<Conversation | null> {
  const store = await readStore();
  return store.conversations[sellerId] ?? null;
}

export async function appendMessage(
  sellerId: string,
  sellerName: string,
  role: MessageRole,
  text: string,
): Promise<AgentMessage> {
  const store = await readStore();
  const existing = store.conversations[sellerId];
  const conversation: Conversation = existing ?? {
    sellerId,
    sellerName,
    messages: [],
    surveys: [],
  };
  // Keep the name fresh if the seller page passed one.
  if (sellerName) conversation.sellerName = sellerName;

  const message: AgentMessage = {
    id: crypto.randomUUID(),
    role,
    text: text.trim(),
    ts: Date.now(),
  };
  conversation.messages.push(message);
  store.conversations[sellerId] = conversation;
  await writeStore(store);
  return message;
}

export async function addSurvey(
  sellerId: string,
  messageId: string,
  helpful: boolean,
  willImplement: boolean,
): Promise<SurveyResponse | null> {
  const store = await readStore();
  const conversation = store.conversations[sellerId];
  if (!conversation) return null;
  // Ignore duplicate submissions for the same analyst reply.
  if (conversation.surveys.some((s) => s.messageId === messageId)) {
    return conversation.surveys.find((s) => s.messageId === messageId) ?? null;
  }
  const survey: SurveyResponse = {
    messageId,
    helpful,
    willImplement,
    ts: Date.now(),
  };
  conversation.surveys.push(survey);
  await writeStore(store);
  return survey;
}
