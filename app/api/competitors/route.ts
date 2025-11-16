import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSellerInfo } from "@/scripts/get_seller_info";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection("competitors");

    const competitors = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Convert _id to string for JSON
    const formattedCompetitors = competitors.map((comp) => ({
      ...comp,
      _id: comp._id.toString(),
    }));

    return NextResponse.json({ success: true, data: formattedCompetitors });
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("competitors");

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Competitor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting competitor:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete competitor",
      },
      { status: 500 }
    );
  }
}
// PATCH - Refresh competitor information and store snapshot history
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get("id");

    if (!competitorId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("competitors");

    // Fetch competitor
    const existing = await collection.findOne({
      _id: new ObjectId(competitorId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    // Must have a store URL to scrape
    if (!existing.storeUrl) {
      return NextResponse.json(
        { error: "Competitor is missing storeUrl" },
        { status: 400 }
      );
    }

    // Scrape latest seller info
    const sellerInfo = await getSellerInfo(existing.storeUrl);

    if (!sellerInfo) {
      return NextResponse.json(
        {
          error:
            "Failed to refresh competitor - bot check detected or could not scrape store",
        },
        { status: 500 }
      );
    }

    // Extract rating from feedback
    const extractRating = (feedback: string | null): number => {
      if (!feedback) return 0;
      const match = feedback.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };

    // Build new snapshot of key metrics
    const nowSnap = {
      followers: sellerInfo.followers ?? existing.followers ?? 0,
      itemsSold: sellerInfo.items_sold ?? existing.trackedProducts ?? 0,
      rating: extractRating(sellerInfo.feedback ?? existing.feedback),
      timestamp: new Date(),
    };

    // Move current snapshot → pastSnapshots
    const pastSnapshots = existing.pastSnapshots || [];
    if (existing.currentSnapshot)
      pastSnapshots.unshift(existing.currentSnapshot);
    const limitedSnapshots = pastSnapshots.slice(0, 7);

    // Prepare updated competitor document
    const updatedCompetitor = {
      name: sellerInfo.seller_name || existing.name,
      logo: sellerInfo.seller_logo || existing.logo,
      tagline: existing.tagline, // preserved
      brandPositioning: existing.brandPositioning,
      avgPriceRange: existing.avgPriceRange,
      promotionFrequency: existing.promotionFrequency,
      avgRating: extractRating(sellerInfo.feedback) || existing.avgRating,
      trackedProducts: sellerInfo.items_sold ?? existing.trackedProducts,
      description: sellerInfo.overview ?? existing.description,
      followers: sellerInfo.followers ?? existing.followers,
      storeUrl: existing.storeUrl,
      feedback: sellerInfo.feedback ?? existing.feedback,
      firstTenItems: sellerInfo.first_10_items ?? existing.firstTenItems,
      lastChecked: new Date().toISOString(),
      currentSnapshot: nowSnap,
      pastSnapshots: limitedSnapshots,
      updatedAt: new Date(),
    };

    // Update database record
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: updatedCompetitor,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Competitor refreshed successfully",
      data: {
        id: existing._id.toString(),
        ...updatedCompetitor,
      },
    });
  } catch (error) {
    console.error("Error refreshing competitor:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh competitor",
      },
      { status: 500 }
    );
  }
}
