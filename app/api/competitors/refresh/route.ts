import { getSellerInfo } from "@/scripts/get_seller_info";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const { id, storeUrl } = await request.json();

    if (!id || !storeUrl) {
      return NextResponse.json(
        { error: "ID and storeUrl are required" },
        { status: 400 }
      );
    }

    console.log(`Refreshing competitor: ${id} with URL: ${storeUrl}`);

    const sellerInfo = await getSellerInfo(storeUrl);

    // Extract rating from feedback
    const extractRating = (feedback: string | null): number => {
      if (!feedback) return 0;
      const match = feedback.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };

    // Prepare updated competitor document
    const updatedData = {
      name: sellerInfo?.seller_name || "Unknown Seller",
      logo: sellerInfo?.seller_logo || "/placeholder.svg",
      avgRating: extractRating(sellerInfo?.feedback),
      trackedProducts: sellerInfo?.items_sold || 0,
      description: sellerInfo?.overview || "",
      followers: sellerInfo?.followers || 0,
      feedback: sellerInfo?.feedback || null,
      firstTenItems: sellerInfo?.first_10_items || [],
      lastChecked: sellerInfo?.last_checked || new Date().toISOString(),
      updatedAt: new Date(),
    };

    // Update in MongoDB
    const db = await getDb();
    const collection = db.collection("competitors");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    // Fetch and return the updated competitor
    const updated = await collection.findOne({ _id: new ObjectId(id) });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to retrieve updated competitor" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Competitor refreshed successfully",
      data: {
        id: updated._id.toString(),
        name: updated.name,
        logo: updated.logo,
        tagline: updated.tagline,
        brandPositioning: updated.brandPositioning,
        avgPriceRange: updated.avgPriceRange,
        promotionFrequency: updated.promotionFrequency,
        avgRating: updated.avgRating,
        trackedProducts: updated.trackedProducts,
        description: updated.description,
        followers: updated.followers,
        storeUrl: updated.storeUrl,
        feedback: updated.feedback,
        firstTenItems: updated.firstTenItems,
        lastChecked: updated.lastChecked,
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
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
