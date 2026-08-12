import { NextResponse } from "next/server";
import { resetAll } from "@/lib/agent-store";

// POST /api/agent/reset?token=<AGENT_RESET_TOKEN>
// Wipes all conversations. Guarded by a token so it can't be triggered
// publicly. Handy for clearing demo data / resetting between test cohorts.
export async function POST(request: Request) {
  const expected = process.env.AGENT_RESET_TOKEN;
  const provided = new URL(request.url).searchParams.get("token");

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleared = await resetAll();
  return NextResponse.json({ ok: true, cleared });
}
