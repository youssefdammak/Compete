import { NextResponse } from "next/server";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get("seller");

    if (!seller) {
      return NextResponse.json(
        { error: "Missing seller query parameter" },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db("Compete"); // change if needed
    const collection = db.collection("products");

    const products = await collection
      .find({ competitor: seller })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ count: products.length, products });
  } catch (err) {
    console.error("Error fetching seller products:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
