import { getSellerInfo } from "@/scripts/get_seller_info";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`Fetching seller info for: ${url}`);

    const sellerInfo = await getSellerInfo(url);

    // Extract rating from feedback
    const extractRating = (feedback: string | null): number => {
      if (!feedback) return 0;
      const match = feedback.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };

    // Prepare competitor document
    const competitor = {
      name: sellerInfo?.seller_name || "Unknown Seller",
      logo: sellerInfo?.seller_logo || "/placeholder.svg",
      tagline: "",
      brandPositioning: "premium" as const,
      avgPriceRange: "$0-$0",
      promotionFrequency: "medium" as const,
      avgRating: extractRating(sellerInfo?.feedback),
      trackedProducts: sellerInfo?.items_sold || 0,
      description: sellerInfo?.overview || "",
      followers: sellerInfo?.followers || 0,
      storeUrl: sellerInfo?.store_url || url,
      feedback: sellerInfo?.feedback || null,
      firstTenItems: sellerInfo?.first_10_items || [],
      lastChecked: sellerInfo?.last_checked || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to MongoDB
    const db = await getDb();
    const collection = db.collection("competitors");

    // Check if competitor already exists by storeUrl
    const existing = await collection.findOne({
      storeUrl: competitor.storeUrl,
    });

    if (existing) {
      // Update existing competitor
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...competitor,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Competitor updated successfully",
        data: {
          id: existing._id.toString(),
          ...competitor,
        },
      });
    } else {
      // Insert new competitor
      const result = await collection.insertOne(competitor);

      return NextResponse.json({
        success: true,
        message: "Competitor added successfully",
        data: {
          id: result.insertedId.toString(),
          ...competitor,
        },
      });
    }
  } catch (error) {
    console.error("Error adding competitor:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add competitor",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

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
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitors",
      },
      { status: 500 }
    );
  }
}
