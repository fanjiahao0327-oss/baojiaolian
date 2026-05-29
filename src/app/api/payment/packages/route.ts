import { NextResponse } from "next/server";
import { PRICE_PACKAGES } from "@/lib/pricing";

export async function GET() {
  return NextResponse.json(PRICE_PACKAGES.map((pkg) => ({
    points: pkg.points,
    amountCents: pkg.amountCents,
    label: pkg.label,
    popular: pkg.popular || false,
  })));
}
