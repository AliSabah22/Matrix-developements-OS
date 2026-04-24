// src/app/api/sessions/route.ts
// List sessions for an agent, or create a new one

import { NextRequest, NextResponse } from "next/server";
import { listSessionsForAgent, createNewSession } from "@/lib/persistence";

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  try {
    const sessions = await listSessionsForAgent(agentId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[sessions GET]", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, projectId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const session = await createNewSession(agentId, projectId ?? null);
    return NextResponse.json({ session });
  } catch (error) {
    console.error("[sessions POST]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
