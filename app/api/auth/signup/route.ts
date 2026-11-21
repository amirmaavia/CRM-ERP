import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Only the system administrator can create accounts. Contact your administrator." }, { status: 403 });
}
