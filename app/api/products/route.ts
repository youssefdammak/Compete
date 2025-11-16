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
      priceHistory: product.priceHistory || [
        product.currentPrice || product.price || 0,
      ],
      category: product.category || "Uncategorized",
      lastUpdated:
        product.lastUpdated || product.timestamp || new Date().toISOString(),
      description: product.description || "",
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
      category: scraped.category || "Uncategorized",
      description: scraped.description || "",
      priceHistory: [scraped.price || 0],
      lastUpdated: new Date().toISOString(),
      timestamp: scrapedData?.timestamp || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
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
      // Update existing product
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...product,
            updatedAt: new Date(),
          },
          $push: {
            priceHistory: {
              $each: [product.currentPrice],
              $slice: -30, // Keep last 30 price points
            },
          },
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
