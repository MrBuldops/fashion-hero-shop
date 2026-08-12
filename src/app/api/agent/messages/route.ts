import { NextResponse } from "next/server";
import {
  appendMessage,
  getConversation,
  listConversations,
  type MessageRole,
} from "@/lib/agent-store";

// GET /api/agent/messages            → all conversations (analyst inbox)
// GET /api/agent/messages?seller=s1  → one conversation (seller chat)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get("seller");

  if (sellerId) {
    const conversation = await getConversation(sellerId);
    return NextResponse.json({ conversation });
  }

  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

// POST /api/agent/messages
// body: { sellerId, sellerName?, role: "seller" | "analyst", text }
export async function POST(request: Request) {
  let body: {
    sellerId?: string;
    sellerName?: string;
    role?: MessageRole;
    text?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sellerId, sellerName = "", role, text } = body;

  if (!sellerId || (role !== "seller" && role !== "analyst") || !text?.trim()) {
    return NextResponse.json(
      { error: "sellerId, role (seller|analyst) and non-empty text are required" },
      { status: 400 },
    );
  }

  const message = await appendMessage(sellerId, sellerName, role, text);
  return NextResponse.json({ message }, { status: 201 });
}
