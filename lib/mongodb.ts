import { MongoClient, Db, MongoClientOptions } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.MONGODB_URI) {
  throw new Error(
    "Please add your MongoDB Atlas connection string to .env.local as MONGODB_URI"
  );
}

const uri = process.env.MONGODB_URI;

// MongoDB Atlas optimized connection options
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 300000,
  serverSelectionTimeoutMS: 30000, // increased from 5000
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
  compressors: ["zlib"] as any,
  w: "majority",
  readPreference: "primary",
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || "compete");
}

// Helper function to test the connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });
    return true;
  } catch (error) {
    console.error("MongoDB Atlas connection test failed:", error);
    return false;
  }
}
