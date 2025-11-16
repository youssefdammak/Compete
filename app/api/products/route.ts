import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { scrapeEbayProduct } from "@/scripts/get_product_info_2";

export const runtime = "nodejs";

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection("products");

    const products = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform MongoDB documents to match the frontend Product type
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
      last_24_hours: product.last_24_hours || "No Info", // ⭐ TEXT ONLY
      watchers_count: product.watchers_count || 0, // ⭐ NUMBER
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
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitor, productUrl, scrapedData } = body;

    if (!competitor) {
      return NextResponse.json(
        { error: "Missing required field: competitor" },
        { status: 400 }
      );
    }

    let scraped: any;

    // If scrapedData is provided, use it; otherwise scrape from productUrl
    if (scrapedData && scrapedData.product) {
      scraped = scrapedData.product;
    } else if (productUrl) {
      // Scrape the product using get_product_info_2
      const scrapeResult = await scrapeEbayProduct(productUrl);

      if (!scrapeResult || !scrapeResult.product) {
        return NextResponse.json(
          {
            error:
              "Failed to scrape product - bot check detected or product not found",
          },
          { status: 500 }
        );
      }

      scraped = scrapeResult.product;
    } else {
      return NextResponse.json(
        { error: "Missing required field: productUrl or scrapedData" },
        { status: 400 }
      );
    }

    // Determine stock status
    const stockStatus = determineStockStatus(scraped.quantity_available);

    // Calculate discount if original price exists
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

    // Create current snapshot
    const nowSnap = {
      price: scraped.price || 0,
      quantity_available: scraped.quantity_available,
      rating: scraped.rating || 0,
      last_24_hours: scraped.last_24_hours || "No Info",
      watchers_count: scraped.watchers_count || 0,
      total_sold_listing: scraped.total_sold_listing || 0,
      timestamp: new Date(),
    };

    // Prepare product document
    const product = {
      competitor: competitor,
      name: scraped.title || scraped.name || "Unknown Product",
      title: scraped.title,
      ebay_item_id: scraped.ebay_item_id,
      product_url: scraped.product_url,
      currentPrice: scraped.price || 0,
      price: scraped.price,
      originalPrice: scraped.originalPrice || null,
      currency: scraped.currency || "USD",
      shipping_cost: scraped.shipping_cost || 0,
      condition: scraped.condition,
      quantity_available: scraped.quantity_available,
      total_sold_listing: scraped.total_sold_listing,
      stock: stockStatus,
      rating: scraped.rating || 0,
      reviewCount: scraped.total_sold_listing || scraped.review_count || 0,
      isDiscounted: isDiscounted,
      discountPercent: discountPercent,
      image: scraped.images && scraped.images[0] ? scraped.images[0] : null,
      images: scraped.images || [],
      last_24_hours: scraped.last_24_hours, // ⭐ TEXT ONLY
      watchers_count: scraped.watchers_count,
      category: scraped.category || "Uncategorized",
      description: scraped.description || "",
      priceHistory: [scraped.price || 0],
      lastUpdated: new Date().toISOString(),
      timestamp: scrapedData?.timestamp || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currentSnapshot: nowSnap,
      pastSnapshots: [],
    };

    // Save to MongoDB
    const db = await getDb();
    const collection = db.collection("products");

    // Check if product already exists by product_url or ebay_item_id
    const existing = await collection.findOne({
      $or: [
        { product_url: product.product_url },
        { ebay_item_id: product.ebay_item_id },
      ],
    });

    if (existing) {
      // Update existing product — move old snapshot to pastSnapshots
      const pastSnapshots = existing.pastSnapshots || [];
      if (existing.currentSnapshot)
        pastSnapshots.unshift(existing.currentSnapshot);
      const limitedSnapshots = pastSnapshots.slice(0, 7);

      // Update existing product
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...product,
            currentSnapshot: nowSnap,
            pastSnapshots: limitedSnapshots,
            updatedAt: new Date(),
          },
          $push: {
            priceHistory: {
              $each: [product.currentPrice],
              $slice: -30, // Keep last 30 price points
            },
          } as any,
        }
      );

      return NextResponse.json({
        success: true,
        message: "Product updated successfully",
        data: {
          id: existing._id.toString(),
          ...product,
        },
      });
    } else {
      // Insert new product
      const result = await collection.insertOne(product);

      return NextResponse.json({
        success: true,
        message: "Product added successfully",
        data: {
          id: result.insertedId.toString(),
          ...product,
        },
      });
    }
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create product",
      },
      { status: 500 }
    );
  }
}

// PATCH - Refresh product information and store snapshot history
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("products");
    const { ObjectId } = require("mongodb");

    // Find the existing product
    const existing = await collection.findOne({
      _id: new ObjectId(productId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Scrape the latest product info
    const scrapeResult = await scrapeEbayProduct(existing.product_url);

    if (!scrapeResult || !scrapeResult.product) {
      return NextResponse.json(
        {
          error:
            "Failed to scrape product - bot check detected or product not found",
        },
        { status: 500 }
      );
    }

    const scraped = scrapeResult.product as any;

    // Determine stock status
    const stockStatus = determineStockStatus(scraped.quantity_available);

    // Calculate discount if original price exists
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

    // Create new snapshot
    const nowSnap = {
      price: scraped.price || 0,
      quantity_available: scraped.quantity_available,
      rating: scraped.rating || 0,
      last_24_hours: scraped.last_24_hours || "No Info",
      watchers_count: scraped.watchers_count || 0,
      total_sold_listing: scraped.total_sold_listing || 0,
      timestamp: new Date(),
    };

    // Move current snapshot to pastSnapshots
    const pastSnapshots = existing.pastSnapshots || [];
    if (existing.currentSnapshot)
      pastSnapshots.unshift(existing.currentSnapshot);
    const limitedSnapshots = pastSnapshots.slice(0, 7);

    // Prepare updated product data
    const updatedProduct = {
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
      isDiscounted: isDiscounted,
      discountPercent: discountPercent,
      image: scraped.images && scraped.images[0] ? scraped.images[0] : null,
      images: scraped.images || [],
      last_24_hours: scraped.last_24_hours,
      watchers_count: scraped.watchers_count,
      category: scraped.category || "Uncategorized",
      description: scraped.description || "",
      currentSnapshot: nowSnap,
      pastSnapshots: limitedSnapshots,
      updatedAt: new Date(),
    };

    // Update the product
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: updatedProduct,
        $push: {
          priceHistory: {
            $each: [scraped.price || 0],
            $slice: -30,
          },
        } as any,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Product refreshed successfully",
      data: {
        id: existing._id.toString(),
        ...updatedProduct,
      },
    });
  } catch (error) {
    console.error("Error refreshing product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to refresh product",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("products");

    const { ObjectId } = require("mongodb");

    const result = await collection.deleteOne({
      _id: new ObjectId(productId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete product",
      },
      { status: 500 }
    );
  }
}

// Helper function to determine stock status
function determineStockStatus(
  quantity: number | null | undefined
): "In Stock" | "Low Stock" | "Out of Stock" {
  if (quantity === null || quantity === undefined) {
    return "In Stock"; // Default assumption
  }
  if (quantity === 0) {
    return "Out of Stock";
  }
  if (quantity < 10) {
    return "Low Stock";
  }
  return "In Stock";
}
