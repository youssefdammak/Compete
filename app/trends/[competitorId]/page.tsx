"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ChevronDown } from "lucide-react";
import CompetitorStats from "@/components/CompetitorStats";
import ProductStats from "@/components/ProductStats";
import { Competitor } from "@/app/interfaces/Competitor";

export default function CompetitorTrendsPage() {
  const params = useParams();
  const competitorId = params?.competitorId as string;

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"seller" | "product">("seller");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [productNames, setProductNames] = useState<string[]>([]);

  // Fetch single competitor data by ID
  useEffect(() => {
    const fetchCompetitor = async () => {
      if (!competitorId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/competitors/${competitorId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setCompetitor(result.data);

            // Fetch products for this competitor
            const products = await fetch(
              "/api/products?seller=" +
                encodeURIComponent(result.data.name || "")
            );
            const productsResult = await products.json();
            const tempProductNames = productsResult.data.map(
              (p: any) => p.name
            );
            setProductNames(tempProductNames);
          }
        } else {
          console.error("Failed to fetch competitor:", response.status);
        }
      } catch (error) {
        console.error("Error fetching competitor:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitor();
  }, [competitorId]);

  const refreshData = useCallback(async () => {
    if (!competitor?.storeUrl) return;
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/cron/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [competitor.storeUrl] }),
      });

      if (response.ok) {
        const result = await response.json();
        const compResult = result.results?.find(
          (r: any) => r.url === competitor.storeUrl
        )?.result;

        if (compResult && compResult.data) {
          setCompetitor(compResult.data);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error("Error refreshing trends:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [competitor?.storeUrl]);

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

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/competitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
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
        </div>
        <Button onClick={refreshData} disabled={isRefreshing} className="gap-2">
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* View Mode Dropdown */}
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
                : selectedProduct || "Select Product"}
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
              {productNames.map((item, idx) => (
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

      {/* Stats */}
      {viewMode === "seller" ? (
        <CompetitorStats competitor={competitor} />
      ) : (
        <ProductStats productName={selectedProduct!} />
      )}
    </div>
  );
}
