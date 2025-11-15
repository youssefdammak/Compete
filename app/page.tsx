export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Competitor Tracking</h1>
        <div className="space-y-4 mt-8">
          <p className="text-lg">
            Run the scraper script:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              npm run scrape
            </code>
          </p>
          <p className="text-lg">
            Or use the API endpoint:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              POST /api/scrape
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
