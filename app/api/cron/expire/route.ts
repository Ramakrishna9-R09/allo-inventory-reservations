import { NextResponse } from "next/server";

import { exceptionResponse } from "@/lib/errors";
import { expirePendingReservations } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await expirePendingReservations();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return exceptionResponse(error);
  }
}
