import { NextResponse } from "next/server";
import { getLivenessProbe } from "@/lib/health/probes";

export async function GET() {
  const result = getLivenessProbe();
  return NextResponse.json(result, { status: 200 });
}
