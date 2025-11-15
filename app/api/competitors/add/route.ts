import { getSellerInfo } from "@/scripts/get_seller_info";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      data: sellerInfo,
    });
  } catch (error) {
    console.error("Error fetching seller info:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch seller information",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
