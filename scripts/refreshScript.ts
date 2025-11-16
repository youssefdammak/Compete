import cron from "node-cron";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { scrapeEbayProduct } from "@/scripts/get_product_info_2";
import { getSellerInfo } from "./get_seller_info";

// -------------------------------
// Cron job: refresh competitors & products every 2 minutes
// -------------------------------
cron.schedule("*/1 * * * *", async () => {
  const db = await getDb();

  // Refresh competitors
  const competitors = await db.collection("competitors").find({}).toArray();
  for (const comp of competitors) {
    try {
      await refreshCompetitor(comp._id.toString());
      console.log(`Refreshed competitor ${comp._id}`);
    } catch (err) {
      console.error(`Failed to refresh competitor ${comp._id}:`, err);
    }
  }

  // Refresh products
  const products = await db.collection("products").find({}).toArray();
  for (const prod of products) {
    try {
      await refreshProduct(prod._id.toString());
      console.log(`Refreshed product ${prod._id}`);
    } catch (err) {
      console.error(`Failed to refresh product ${prod._id}:`, err);
    }
  }
});

// -------------------------------
// Competitor refresh
// -------------------------------
export async function refreshCompetitor(competitorId: string) {
  const db = await getDb();
  const collection = db.collection("competitors");

  const existing = await collection.findOne({
    _id: new ObjectId(competitorId),
  });
  if (!existing) throw new Error("Competitor not found");
  if (!existing.storeUrl) throw new Error("Competitor is missing storeUrl");

  const sellerInfo = await getSellerInfo(existing.storeUrl);
  if (!sellerInfo) throw new Error("Failed to scrape competitor");

  const extractRating = (feedback: string | null) =>
    feedback ? parseFloat(feedback.match(/(\d+\.?\d*)/)?.[1] || "0") : 0;

  const nowSnap = {
    followers: sellerInfo.followers ?? existing.followers ?? 0,
    itemsSold: sellerInfo.items_sold ?? existing.trackedProducts ?? 0,
    rating: extractRating(sellerInfo.feedback ?? existing.feedback),
    timestamp: new Date(),
  };

  const pastSnapshots = existing.pastSnapshots || [];
  if (existing.currentSnapshot) pastSnapshots.unshift(existing.currentSnapshot);
  const limitedSnapshots = pastSnapshots.slice(0, 7);

  const updatedCompetitor = {
    ...existing,
    name: sellerInfo.seller_name || existing.name,
    logo: sellerInfo.seller_logo || existing.logo,
    avgRating: extractRating(sellerInfo.feedback) || existing.avgRating,
    trackedProducts: sellerInfo.items_sold ?? existing.trackedProducts,
    description: sellerInfo.overview ?? existing.description,
    followers: sellerInfo.followers ?? existing.followers,
    feedback: sellerInfo.feedback ?? existing.feedback,
    firstTenItems: sellerInfo.first_10_items ?? existing.firstTenItems,
    currentSnapshot: nowSnap,
    pastSnapshots: limitedSnapshots,
    lastChecked: new Date().toISOString(),
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { _id: existing._id },
    { $set: updatedCompetitor }
  );
  return updatedCompetitor;
}

// -------------------------------
// Product refresh
// -------------------------------
export async function refreshProduct(productId: string) {
  const db = await getDb();
  const collection = db.collection("products");

  const existing = await collection.findOne({ _id: new ObjectId(productId) });
  if (!existing) throw new Error("Product not found");

  const scrapeResult = await scrapeEbayProduct(existing.product_url);
  if (!scrapeResult?.product) throw new Error("Failed to scrape product");

  const scraped = scrapeResult.product as any;

  const determineStockStatus = (quantity: number | null) =>
    quantity == null ? "Unknown" : quantity > 0 ? "In Stock" : "Out of Stock";

  const stockStatus = determineStockStatus(scraped.quantity_available);
  const isDiscounted =
    scraped.originalPrice && scraped.price
      ? scraped.originalPrice > scraped.price
      : false;
  const discountPercent =
    isDiscounted && scraped.originalPrice && scraped.price
      ? Math.round(
          ((scraped.originalPrice - scraped.price) / scraped.originalPrice) *
            100
        )
      : null;

  const nowSnap = {
    price: scraped.price || 0,
    quantity_available: scraped.quantity_available,
    rating: scraped.rating || 0,
    last_24_hours: scraped.last_24_hours || "No Info",
    watchers_count: scraped.watchers_count || 0,
    total_sold_listing: scraped.total_sold_listing || 0,
    timestamp: new Date(),
  };

  const pastSnapshots = existing.pastSnapshots || [];
  if (existing.currentSnapshot) pastSnapshots.unshift(existing.currentSnapshot);
  const limitedSnapshots = pastSnapshots.slice(0, 7);

  const updatedProduct = {
    ...existing,
    name: scraped.title || scraped.name || existing.name,
    title: scraped.title,
    currentPrice: scraped.price || existing.currentPrice,
    price: scraped.price,
    originalPrice: scraped.originalPrice || null,
    shipping_cost: scraped.shipping_cost || 0,
    condition: scraped.condition,
    quantity_available: scraped.quantity_available,
    total_sold_listing: scraped.total_sold_listing,
    stock: stockStatus,
    rating: scraped.rating || 0,
    reviewCount: scraped.total_sold_listing || scraped.review_count || 0,
    isDiscounted,
    discountPercent,
    image: scraped.images?.[0] || null,
    images: scraped.images || [],
    last_24_hours: scraped.last_24_hours,
    watchers_count: scraped.watchers_count,
    category: scraped.category || "Uncategorized",
    description: scraped.description || "",
    currentSnapshot: nowSnap,
    pastSnapshots: limitedSnapshots,
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: updatedProduct,
      $push: {
        priceHistory: { $each: [scraped.price || 0], $slice: -30 },
      } as any,
    }
  );

  return updatedProduct;
}
