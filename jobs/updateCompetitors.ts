import { getDb } from "@/lib/mongodb";
import { getSellerInfo } from "../scripts/get_seller_info";

export async function updateCompetitor(storeUrl: string) {
  const db = await getDb();
  const competitors = db.collection("competitors");

  const data = await getSellerInfo(storeUrl);
  if (!data) throw new Error("Scrape failed");

  // Create current snapshot
  const nowSnap = {
    productsCount: data.items_sold ?? 0,
    avgPrice: null, // You can calculate avgPrice from items if needed
    followers: data.followers ?? 0,
    feedback: data.feedback ?? null,
    timestamp: new Date(),
    firstTenItems: data.first_10_items || [],
  };

  // Build main competitor info
  const updatePayload = {
    name: data.seller_name || "Unknown Seller",
    logo: data.seller_logo || "/placeholder.svg",
    tagline: "",
    brandPositioning: "premium",
    avgPriceRange: "$0-$0",
    promotionFrequency: "medium",
    avgRating: parseFloat((data.feedback || "0").replace("%", "")) || 0,
    trackedProducts: data.items_sold ?? 0,
    description: data.overview || "",
    followers: data.followers ?? 0,
    storeUrl: data.store_url || storeUrl,
    feedback: data.feedback ?? null,
    firstTenItems: data.first_10_items || [],
    lastChecked: new Date(),
    updatedAt: new Date(),
  };

  const existing = await competitors.findOne({ storeUrl });

  let finalCompetitor;

  if (!existing) {
    // Insert new competitor with empty pastSnapshots
    const inserted = await competitors.insertOne({
      ...updatePayload,
      currentSnapshot: nowSnap,
      pastSnapshots: [],
      createdAt: new Date(),
    });
    finalCompetitor = {
      ...updatePayload,
      currentSnapshot: nowSnap,
      pastSnapshots: [],
      _id: inserted.insertedId,
    };
  } else {
    // Existing competitor — move old snapshot to pastSnapshots
    const pastSnapshots = existing.pastSnapshots || [];
    if (existing.currentSnapshot) pastSnapshots.unshift(existing.currentSnapshot);

    const limitedSnapshots = pastSnapshots.slice(0, 7);

    await competitors.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...updatePayload,
          currentSnapshot: nowSnap,
          pastSnapshots: limitedSnapshots,
        },
      }
    );

    finalCompetitor = {
      ...updatePayload,
      currentSnapshot: nowSnap,
      pastSnapshots: limitedSnapshots,
      _id: existing._id,
    };
  }

  // Return the full data for charts
  return finalCompetitor;
}
