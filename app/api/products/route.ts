import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// Reuse same stock helper if needed
function determineStockStatus(quantity: number | null | undefined) {
  if (quantity === null || quantity === undefined) return "In Stock";
  if (quantity === 0) return "Out of Stock";
  if (quantity < 10) return "Low Stock";
  return "In Stock";
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get("seller");

    if (!seller) {
      return NextResponse.json(
        { error: "Missing ?seller= query parameter" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("products");

    const products = await collection
      .find({ competitor: seller })
      .sort({ createdAt: -1 })
      .toArray();

    // Format to frontend Product type (same as your main GET)
    const formattedProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name || product.title || "Unknown Product",
      competitor: product.competitor || "Unknown",
      currentPrice: product.currentPrice || product.price || 0,
      originalPrice: product.originalPrice || null,
      stock: product.stock || determineStockStatus(product.quantity_available),
      rating: product.rating || 0,
      reviewCount: product.reviewCount || product.total_sold_listing || 0,
      isDiscounted: product.isDiscounted || false,
      discountPercent: product.discountPercent || null,
      image:
        product.image ||
        (product.images && product.images[0]) ||
        "/placeholder.svg",
      images: product.images || [],
      ebay_item_id: product.ebay_item_id || null,
      currency: product.currency || null,
      shipping_cost: product.shipping_cost || null,
      condition: product.condition || null,
      quantity_available: product.quantity_available ?? null,
      total_sold_listing: product.total_sold_listing ?? null,
      priceHistory: product.priceHistory || [
        product.currentPrice || product.price || 0,
      ],
      last_24_hours: product.last_24_hours || "No Info",
      watchers_count: product.watchers_count || 0,
      category: product.category || "Uncategorized",
      lastUpdated:
        product.lastUpdated || product.timestamp || new Date().toISOString(),
      description: product.description || "",
      product_url: product.product_url || "",
      currentSnapshot: product.currentSnapshot || null,
      pastSnapshots: product.pastSnapshots || [],
    }));

    return NextResponse.json({
      success: true,
      seller: seller,
      count: formattedProducts.length,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching products by seller:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch seller products",
      },
      { status: 500 }
    );
  }
}
