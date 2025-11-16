import { MongoClient, Db, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "Please add your MongoDB Atlas connection string to .env.local as MONGODB_URI"
  );
}

const uri = process.env.MONGODB_URI;

// MongoDB Atlas optimized connection options
const options: MongoClientOptions = {
  // Connection pool settings optimized for Atlas
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

  // Server selection and timeout settings
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout

  // Retry settings for Atlas
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads

  // Compression (Atlas supports compression)
  compressors: ["zlib"] as any,

  // Write concern for Atlas
  w: "majority",

  // Read preference
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
