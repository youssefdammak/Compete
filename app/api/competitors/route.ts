import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection("competitors");
    
    const competitors = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform MongoDB documents to match the frontend Competitor type
    const formattedCompetitors = competitors.map((comp) => ({
      id: comp._id.toString(),
      name: comp.name,
      logo: comp.logo,
      tagline: comp.tagline,
      brandPositioning: comp.brandPositioning,
      avgPriceRange: comp.avgPriceRange,
      promotionFrequency: comp.promotionFrequency,
      avgRating: comp.avgRating,
      trackedProducts: comp.trackedProducts,
      description: comp.description,
      followers: comp.followers,
      storeUrl: comp.storeUrl,
      feedback: comp.feedback,
      firstTenItems: comp.firstTenItems,
      lastChecked: comp.lastChecked,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCompetitors,
    });
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch competitors",
      },
      { status: 500 }
    );
  }
}
