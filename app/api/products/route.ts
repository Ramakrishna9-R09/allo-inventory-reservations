import { NextResponse } from "next/server";

import { exceptionResponse } from "@/lib/errors";
import { getProductsWithAvailability } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getProductsWithAvailability();
    return NextResponse.json({ products });
  } catch (error) {
    return exceptionResponse(error);
  }
}
