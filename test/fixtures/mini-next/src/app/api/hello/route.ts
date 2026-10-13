import { NextResponse } from "next/server";
import { greet } from "../../../lib";

export async function GET() {
  return NextResponse.json({ message: greet("api") });
}
