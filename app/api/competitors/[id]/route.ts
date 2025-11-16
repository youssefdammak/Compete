import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing competitor ID" },
        { status: 400 }
      );
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("competitors");

    const comp = await collection.findOne({ _id: objectId });

    if (!comp) {
      return NextResponse.json(
        { error: `No competitor found with ID "${id}"` },
        { status: 404 }
      );
    }

    // Convert _id to string
    return NextResponse.json({
      success: true,
      data: { ...comp, _id: comp._id.toString() },
    });
  } catch (error) {
    console.error("Error fetching competitor:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch competitor",
      },
      { status: 500 }
    );
  }
}
