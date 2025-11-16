import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// Determine stock status
function determineStockStatus(quantity: number | null | undefined) {
  if (quantity == null) return "Unknown";
  if (quantity === 0) return "Out of Stock";
  if (quantity < 10) return "Low Stock";
  return "In Stock";
}

export async function GET(req: Request, context: { params: { name: string } }) {
  try {
    // params may be a promise in some Next.js versions
    const params = await context.params;
    const name = decodeURIComponent(params.name);

    if (!name) {
      return NextResponse.json(
        { error: "Missing product name parameter" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("products");

    const product = await collection.findOne({ name });

    if (!product) {
      return NextResponse.json(
        { error: `No product found with name "${name}"` },
        { status: 404 }
      );
    }

    const formattedProduct = {
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
    };

    return NextResponse.json({ success: true, data: formattedProduct });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch product",
      },
      { status: 500 }
    );
  }
}
