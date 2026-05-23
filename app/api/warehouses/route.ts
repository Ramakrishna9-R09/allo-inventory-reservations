import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { exceptionResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ warehouses });
  } catch (error) {
    return exceptionResponse(error);
  }
}
