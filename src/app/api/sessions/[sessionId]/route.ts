// src/app/api/sessions/[sessionId]/route.ts
// Load, update, or delete a specific session

import { NextRequest, NextResponse } from "next/server";
import {
  getSessionWithMessages,
  deleteSession,
  toggleSessionPin,
  updateSessionTitle,
} from "@/lib/persistence";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const session = await getSessionWithMessages(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    console.error("[session GET]", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const body = await request.json();

    if (body.action === "pin") {
      const session = await toggleSessionPin(sessionId);
      return NextResponse.json({ session });
    }

    if (body.title) {
      const session = await updateSessionTitle(sessionId, body.title);
      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[session PATCH]", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    await deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[session DELETE]", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
