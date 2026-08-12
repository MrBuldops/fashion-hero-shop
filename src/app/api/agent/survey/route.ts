import { NextResponse } from "next/server";
import { addSurvey } from "@/lib/agent-store";

// POST /api/agent/survey
// body: { sellerId, messageId, helpful, willImplement }
export async function POST(request: Request) {
  let body: {
    sellerId?: string;
    messageId?: string;
    helpful?: boolean;
    willImplement?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sellerId, messageId, helpful, willImplement } = body;

  if (
    !sellerId ||
    !messageId ||
    typeof helpful !== "boolean" ||
    typeof willImplement !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "sellerId, messageId, helpful (bool) and willImplement (bool) are required",
      },
      { status: 400 },
    );
  }

  const survey = await addSurvey(sellerId, messageId, helpful, willImplement);
  if (!survey) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ survey }, { status: 201 });
}
