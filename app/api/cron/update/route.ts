import { NextRequest, NextResponse } from "next/server";
import { updateCompetitor } from "@/jobs/updateCompetitors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const competitorsToTrack = [
      "https://www.ebay.ca/str/surplusbydesign",
      // add more store URLs
    ];

    const results = [];

    for (const url of competitorsToTrack) {
      try {
        const result = await updateCompetitor(url);
        results.push({ url, result });
      } catch (err) {
        results.push({ url, error: (err as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
