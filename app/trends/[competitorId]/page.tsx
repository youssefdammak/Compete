"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CompetitorData {
  id: string;
  name: string;
  logo: string;
  followers?: number;
  feedback?: string | null;
  trackedProducts?: number;
  avgRating?: number;
  firstTenItems?: Array<{ title: string | null; link: string | null }>;
  storeUrl?: string;
}

interface ProductTrend {
  title: string;
  price: number;
  trend: number;
  inStock: boolean;
}

interface TrendSnapshot {
  timestamp: string;
  avgPrice: number;
  discountCount: number;
  avgRating: number;
  products: ProductTrend[];
}

export default function CompetitorTrendsPage() {
  const params = useParams();
  const competitorId = params?.competitorId as string;

  const [competitor, setCompetitor] = useState<CompetitorData | null>(null);
  const [trends, setTrends] = useState<TrendSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"seller" | "product">("seller");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [productNames, setProductNames] = useState<string[]>([]);

  // Fetch competitor data
  useEffect(() => {
    const fetchCompetitor = async () => {
      try {
        const response = await fetch(`/api/competitors`);
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            const comp = result.data.find((c: any) => c.id === competitorId);
            if (comp) {
              setCompetitor(comp);

              const products = await fetch(
                "/api/products?seller=" + encodeURIComponent(comp.name || "")
              );
              const productsResult = await products.json();
              const tempProductNames = productsResult.data.map(
                (p: any) => p.name
              );
              setProductNames(tempProductNames);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching competitor:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (competitorId) {
      fetchCompetitor();
    }
  }, [competitorId]);

  // Calculate trends from product data
  const calculateTrends = useCallback(
    (products: any[]) => {
      if (!products || products.length === 0) return [];

      const snapshot: TrendSnapshot = {
        timestamp: new Date().toISOString(),
        avgPrice:
          products.reduce((sum, p) => sum + (p.price || 0), 0) /
          products.length,
        discountCount: products.filter(
          (p) => p.price < (p.originalPrice || p.price * 1.2)
        ).length,
        avgRating: competitor?.avgRating || 0,
        products: products.map((p) => ({
          title: p.title || "Unknown",
          price: p.price || 0,
          trend: Math.random() * 20 - 10,
          inStock: true,
        })),
      };

      return [snapshot];
    },
    [competitor?.avgRating]
  );

  // Fetch and update trends
  const refreshTrends = useCallback(async () => {
    if (!competitor?.storeUrl) return;

    try {
      setIsRefreshing(true);

      const response = await fetch("/api/cron/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [competitor.storeUrl] }),
      });

      if (response.ok) {
        const result = await response.json();

        // The API returns: { success, timestamp, results: [{url, result}] }
        const compResult = result.results?.find(
          (r: any) => r.url === competitor.storeUrl
        )?.result;

        if (compResult && compResult.data) {
          const newTrends = calculateTrends(
            compResult.data.firstTenItems || []
          );
          setTrends((prev) => [...newTrends, ...prev].slice(0, 50));
          setCompetitor(compResult.data);
          setLastUpdated(new Date());
        }
      } else {
        console.error("Failed to refresh trends:", response.statusText);
      }
    } catch (error) {
      console.error("Error refreshing trends:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [competitor?.storeUrl, calculateTrends]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    if (!competitor?.storeUrl) return;

    const interval = setInterval(refreshTrends, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [competitor?.storeUrl, refreshTrends]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading trends...</p>
      </div>
    );
  }

  if (!competitor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Competitor not found</p>
        <Link href="/competitors">
          <Button variant="outline">Back to Competitors</Button>
        </Link>
      </div>
    );
  }

  const latestTrend = trends[0];

  // Prepare chart data
  const priceChartData =
    trends.length > 0
      ? trends
          .slice(0, 30)
          .reverse()
          .map((t, idx) => ({
            date: `Snapshot ${idx + 1}`,
            price: t.avgPrice,
            timestamp: new Date(t.timestamp).toLocaleDateString(),
          }))
      : [
          { date: "Snapshot 1", price: 125.99, timestamp: "11/1/2025" },
          { date: "Snapshot 2", price: 124.5, timestamp: "11/2/2025" },
          { date: "Snapshot 3", price: 123.99, timestamp: "11/3/2025" },
          { date: "Snapshot 4", price: 122.75, timestamp: "11/4/2025" },
          { date: "Snapshot 5", price: 121.5, timestamp: "11/5/2025" },
          { date: "Snapshot 6", price: 120.99, timestamp: "11/6/2025" },
          { date: "Snapshot 7", price: 119.75, timestamp: "11/7/2025" },
        ];

  const discountChartData =
    trends.length > 0
      ? trends
          .slice(0, 30)
          .reverse()
          .map((t, idx) => ({
            name: `Snapshot ${idx + 1}`,
            discounted: t.discountCount,
            regular: (competitor.trackedProducts || 10) - t.discountCount,
          }))
      : [
          { name: "Snapshot 1", discounted: 3, regular: 7 },
          { name: "Snapshot 2", discounted: 4, regular: 6 },
          { name: "Snapshot 3", discounted: 5, regular: 5 },
          { name: "Snapshot 4", discounted: 6, regular: 4 },
          { name: "Snapshot 5", discounted: 5, regular: 5 },
          { name: "Snapshot 6", discounted: 7, regular: 3 },
          { name: "Snapshot 7", discounted: 6, regular: 4 },
        ];

  const ratingChartData =
    trends.length > 0
      ? trends
          .slice(0, 30)
          .reverse()
          .map((t, idx) => ({
            date: `Snapshot ${idx + 1}`,
            rating: t.avgRating,
            timestamp: new Date(t.timestamp).toLocaleDateString(),
          }))
      : [
          { date: "Snapshot 1", rating: 4.5, timestamp: "11/1/2025" },
          { date: "Snapshot 2", rating: 4.5, timestamp: "11/2/2025" },
          { date: "Snapshot 3", rating: 4.6, timestamp: "11/3/2025" },
          { date: "Snapshot 4", rating: 4.6, timestamp: "11/4/2025" },
          { date: "Snapshot 5", rating: 4.7, timestamp: "11/5/2025" },
          { date: "Snapshot 6", rating: 4.7, timestamp: "11/6/2025" },
          { date: "Snapshot 7", rating: 4.8, timestamp: "11/7/2025" },
        ];

  const stockData = [
    {
      name: competitor.name,
      inStock: competitor.trackedProducts || 10,
      lowStock: Math.floor((competitor.trackedProducts || 10) * 0.2),
      outOfStock: Math.floor((competitor.trackedProducts || 10) * 0.1),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/competitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              {competitor.logo && (
                <img
                  src={competitor.logo}
                  alt={competitor.name}
                  className="h-10 w-10 rounded"
                />
              )}
              <h1 className="text-3xl font-bold">{competitor.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {trends.length} snapshots collected
              {lastUpdated && (
                <span> • Last updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
        </div>

        <Button
          onClick={refreshTrends}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* View Mode Selector */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">View:</span>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium max-w-xs truncate">
              {viewMode === "seller"
                ? "Seller Summary"
                : `${selectedProduct || "Select Product"}`}
            </span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 w-80 max-h-96 overflow-y-auto">
              <button
                onClick={() => {
                  setViewMode("seller");
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors border-b border-border ${
                  viewMode === "seller"
                    ? "bg-primary/10 text-primary font-semibold"
                    : ""
                }`}
              >
                📊 Seller Summary
              </button>
              {productNames &&
                productNames.length > 0 &&
                productNames.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setViewMode("product");
                      setSelectedProduct(item || `Product ${idx + 1}`);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                      viewMode === "product" && selectedProduct === item
                        ? "bg-primary/10 text-primary font-semibold"
                        : ""
                    }`}
                    title={item || ""}
                  >
                    <span className="text-xs text-muted-foreground mr-2">
                      Product {idx + 1}
                    </span>
                    <br />
                    <span className="line-clamp-2">
                      {item || `Product ${idx + 1}`}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {latestTrend && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 border-border bg-card">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {viewMode === "seller"
                  ? "Avg Price Trend"
                  : `${selectedProduct} Price`}
              </p>
              <p className="text-2xl font-bold">
                $
                {viewMode === "seller"
                  ? latestTrend.avgPrice.toFixed(2)
                  : (125.99 - Math.random() * 20).toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">Latest snapshot</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {viewMode === "seller" ? "Active Discounts" : "Status"}
              </p>
              <p className="text-2xl font-bold">
                {viewMode === "seller"
                  ? `${latestTrend.discountCount} / ${
                      competitor.trackedProducts || 10
                    }`
                  : "In Stock"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-500">
                  {viewMode === "seller" ? "Products on sale" : "Available"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Seller Rating
              </p>
              <p className="text-2xl font-bold">
                {competitor.avgRating?.toFixed(1) || "N/A"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-500">
                  {competitor.followers?.toLocaleString() || "0"} followers
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Price Trends */}
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {viewMode === "seller"
              ? "Price Trends"
              : `${selectedProduct} Price Trend`}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {viewMode === "seller"
              ? `Average product prices over time (${trends.length} snapshots)`
              : `Price history for selected product (${trends.length} snapshots)`}
          </p>
          {priceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => `$${(value as number).toFixed(2)}`}
                  labelFormatter={(label) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={viewMode === "seller" ? "#8b5cf6" : "#3b82f6"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No price data collected yet
            </p>
          )}
        </Card>

        {/* Discount/Stock Trends */}
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {viewMode === "seller"
              ? "Discount Trends"
              : `${selectedProduct} Availability`}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {viewMode === "seller"
              ? "Number of discounted products over time"
              : "Product availability tracking"}
          </p>
          {discountChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={discountChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="name"
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#888" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {viewMode === "seller" ? (
                  <>
                    <Bar
                      dataKey="discounted"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="regular"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                ) : (
                  <Bar
                    dataKey="discounted"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Stock Level"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No data collected yet
            </p>
          )}
        </Card>

        {/* Ratings Trends */}
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {viewMode === "seller"
              ? "Seller Rating Trend"
              : `${selectedProduct} Reviews`}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {viewMode === "seller"
              ? `Seller rating over time (${trends.length} snapshots)`
              : `Review trends for selected product`}
          </p>
          {ratingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ratingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                  domain={[0, 5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => (value as number).toFixed(2)}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke={viewMode === "seller" ? "#10b981" : "#f59e0b"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No rating data collected yet
            </p>
          )}
        </Card>

        {/* Stock Summary */}
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {viewMode === "seller"
              ? "Stock Availability"
              : `${selectedProduct} Stock`}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {viewMode === "seller"
              ? "Product availability summary"
              : "Product stock levels"}
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {viewMode === "seller" ? "In Stock" : "Available"}
                </p>
                <p className="text-2xl font-bold text-green-500">
                  {viewMode === "seller"
                    ? stockData[0].inStock
                    : Math.floor(Math.random() * 100 + 50)}
                </p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {viewMode === "seller" ? "Low Stock" : "Sold"}
                </p>
                <p className="text-2xl font-bold text-orange-500">
                  {viewMode === "seller"
                    ? stockData[0].lowStock
                    : Math.floor(Math.random() * 50)}
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {viewMode === "seller" ? "Out of Stock" : "Views"}
                </p>
                <p className="text-2xl font-bold text-red-500">
                  {viewMode === "seller"
                    ? stockData[0].outOfStock
                    : Math.floor(Math.random() * 500 + 100)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={
                  viewMode === "seller"
                    ? stockData
                    : [
                        {
                          name: selectedProduct,
                          inStock: Math.floor(Math.random() * 100),
                          lowStock: Math.floor(Math.random() * 30),
                          outOfStock: Math.floor(Math.random() * 10),
                        },
                      ]
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="name"
                  stroke="#888"
                  style={{ fontSize: "11px" }}
                />
                <YAxis stroke="#888" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="inStock" stackId="a" fill="#10b981" />
                <Bar dataKey="lowStock" stackId="a" fill="#f59e0b" />
                <Bar
                  dataKey="outOfStock"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tracked Products - Only show in seller summary mode */}
      {viewMode === "seller" && (
        <>
          <Card className="p-6 border-border bg-card mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Tracked Products ({competitor.trackedProducts || 0})
            </h2>
            <div className="space-y-3">
              {competitor.firstTenItems &&
              competitor.firstTenItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {competitor.firstTenItems.slice(0, 10).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border border-border rounded hover:bg-muted/50 transition-colors"
                      title={item.title || ""}
                    >
                      <p className="text-sm truncate">{item.title}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No products tracked yet
                </p>
              )}
            </div>
          </Card>

          {/* Products Summary */}
          <Card className="p-6 border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">Product Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">
                      Product
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Price
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Trend
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitor.firstTenItems &&
                  competitor.firstTenItems.length > 0 ? (
                    competitor.firstTenItems.slice(0, 10).map((item, idx) => {
                      const mockPrice = 125.99 - idx * 5;
                      const trend = Math.random() > 0.5 ? "up" : "down";
                      const trendPercent = Math.floor(Math.random() * 10 + 1);

                      return (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setViewMode("product");
                            setSelectedProduct(
                              item.title || `Product ${idx + 1}`
                            );
                          }}
                        >
                          <td className="py-3 px-4">
                            <p className="truncate max-w-xs">
                              {item.title || "Unknown"}
                            </p>
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            ${mockPrice.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {trend === "up" ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500">
                                    +{trendPercent}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-green-500" />
                                  <span className="text-green-500">
                                    -{trendPercent}%
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-green-500/10 text-green-500">
                              In Stock
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <a
                              href={item.link || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-2 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 px-4 text-center text-muted-foreground"
                      >
                        No products tracked yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
