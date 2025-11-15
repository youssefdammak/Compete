import { NextRequest, NextResponse } from "next/server";
import { trackProduct } from "@/lib/scraper";

export const runtime = "nodejs"; // Ensure this runs on Node.js runtime

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitor, productName, productUrl } = body;

    if (!competitor || !productName || !productUrl) {
      return NextResponse.json(
        { error: "Missing required fields: competitor, productName, productUrl" },
        { status: 400 }
      );
    }

    const result = await trackProduct(competitor, productName, productUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape product",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const competitor = searchParams.get("competitor");
  const productName = searchParams.get("productName");
  const productUrl = searchParams.get("productUrl");

  if (!competitor || !productName || !productUrl) {
    return NextResponse.json(
      {
        error: "Missing required query parameters: competitor, productName, productUrl",
        example: "/api/scrape?competitor=Nike&productName=Air%20Jordan%201&productUrl=https://www.nike.com/air-jordan-1",
      },
      { status: 400 }
    );
  }

  try {
    const result = await trackProduct(competitor, productName, productUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape product",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

