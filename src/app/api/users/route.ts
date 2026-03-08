import { NextResponse } from "next/server";

// GET/POST removed — no legitimate use case, was exposing all users without auth
export async function GET() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
