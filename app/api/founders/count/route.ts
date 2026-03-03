import { NextResponse } from "next/server";
import { getFoundersClaimedCount } from "@/lib/founders-count";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const claimed = await getFoundersClaimedCount();
    return NextResponse.json({ claimed });
  } catch {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
}
