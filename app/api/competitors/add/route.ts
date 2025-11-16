import { getSellerInfo } from "@/scripts/get_seller_info";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
export const runtime = "nodejs";

/* --------------------------- 📌 POST — Add Competitor --------------------------- */
export async function POST(request: NextRequest) {
  console.log("Authorization header:", request.headers.get("authorization"));

  try {
    const userId = await getUserFromRequest(request);
    if (!userId)
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid Firebase token" },
        { status: 401 }
      );

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    console.log(`Fetching seller info for: ${url}`);
    const sellerInfo = await getSellerInfo(url);

    const extractRating = (feedback: string | null): number => {
      if (!feedback) return 0;
      const match = feedback.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const competitor = {
      userId, // 🔥 link competitor to Firebase user
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
      lastChecked: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const collection = db.collection("competitors");

    // Check if same competitor already exists for this user
    const existing = await collection.findOne({
      userId,
      storeUrl: competitor.storeUrl,
    });

    if (existing) {
      const result =await collection.updateOne(
        { _id: existing._id },
        { $set: { ...competitor, updatedAt: new Date() } }

      );

      return NextResponse.json({
        success: true,
        message: "Competitor updated successfully",
        data: { id: existing._id.toString(), ...competitor },
      });
    }

    const result = await collection.insertOne(competitor);

    return NextResponse.json({
      success: true,
      message: "Competitor added successfully",
      data: { id: result.insertedId.toString(), ...competitor },
    });
  } catch (error) {
    console.error("Error adding competitor:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add competitor",
      },
      { status: 500 }
    );
  }
}