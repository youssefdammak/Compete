"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompetitorCard } from "@/components/competitor-card";
import { CompetitorTable } from "@/components/competitor-table";
import { CompetitorModal } from "@/components/competitor-modal";
import { AddCompetitorModal } from "@/components/add-competitor-modal";
import { FilterSidebar } from "@/components/filter-sidebar";
import { useCurrentUser } from "@/hooks/useCurrentUser";


import { Competitor } from "@/app/interfaces/Competitor";

type SortOption =
  | "price-low"
  | "price-high"
  | "rating"
  | "promotion"
  | "products";

export default function CompetitorsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
 const [refresher, setRefresher] = useState(false);
  // FILTER STATES
  const [brandPositioningFilters, setBrandPositioningFilters] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [promotionFrequencyFilters, setPromotionFrequencyFilters] = useState<string[]>([]);

  // USER + TOKEN
  const { user, token, loading: authLoading } = useCurrentUser();

  // ⭐ ⭐ ⭐ FIX: stable token ⭐ ⭐ ⭐
  const [stableToken, setStableToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && token) {
      console.log("🔐 Stable token ready:", token);
      setStableToken(token);
    }
  }, [authLoading, token]);


  // ---------------------- 📥 Fetch competitors ----------------------
  useEffect(() => {
    if (!stableToken) return;

    const fetchCompetitors = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/competitors", {
          headers: { Authorization: `Bearer ${stableToken}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.data) setCompetitors(data.data);
      } catch (error) {
        console.error("Error fetching competitors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitors();
  }, [stableToken, refresher]);


  // ---------------------- ➕ FIXED Add Competitor ----------------------
  const handleAddCompetitor = async (url: string) => {
    if (authLoading) {
      alert("Authenticating… please wait 1–2 seconds.");
      return;
    }

    if (!user || !stableToken) {
      alert("Token not ready. Try again in 1 second.");
      return;
    }

    console.log("📤 SENDING TOKEN:", stableToken);

    try {
      setIsAddingCompetitor(true);
      setIsLoading(true);
      
      const response = await fetch("/api/competitors/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${stableToken}`, // ALWAYS VALID NOW
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      // Refresh competitor list
      const refresh = await fetch("/api/competitors", {
        headers: { Authorization: `Bearer ${stableToken}` },
      });

      const refreshData = await refresh.json();
      if (refreshData.success) setCompetitors(refreshData.data);

      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add competitor:", error);
      alert(error instanceof Error ? error.message : "Failed to add competitor");
    } finally {
      setIsAddingCompetitor(false);
      setIsLoading(false);
    }
  };



  // ---------------------- UI BELOW IS UNCHANGED ----------------------

  const filteredAndSortedCompetitors = useMemo(() => {
    let result = [...competitors];

    if (searchQuery) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.tagline.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (brandPositioningFilters.length > 0) {
      result = result.filter((c) =>
        brandPositioningFilters.includes(c.brandPositioning)
      );
    }

    if (minRating > 0) {
      result = result.filter((c) => c.avgRating >= minRating);
    }

    if (promotionFrequencyFilters.length > 0) {
      result = result.filter((c) =>
        promotionFrequencyFilters.includes(c.promotionFrequency)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (
            parseInt(a.avgPriceRange.split("-")[0].replace(/\D/g, "")) -
            parseInt(b.avgPriceRange.split("-")[0].replace(/\D/g, ""))
          );
        case "price-high":
          return (
            parseInt(b.avgPriceRange.split("-")[1].replace(/\D/g, "")) -
            parseInt(a.avgPriceRange.split("-")[1].replace(/\D/g, ""))
          );
        case "rating":
          return b.avgRating - a.avgRating;
        case "promotion":
          const promoOrder = { high: 3, medium: 2, low: 1 };
          return promoOrder[b.promotionFrequency] - promoOrder[a.promotionFrequency];
        case "products":
          return b.trackedProducts - a.trackedProducts;
        default:
          return 0;
      }
    });

    return result;
  }, [
    competitors,
    searchQuery,
    sortBy,
    brandPositioningFilters,
    minRating,
    promotionFrequencyFilters,
  ]);


  return (
    <div className="flex h-screen overflow-hidden">
      {/* Filters Sidebar */}
      <FilterSidebar
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        brandPositioningFilters={brandPositioningFilters}
        setBrandPositioningFilters={setBrandPositioningFilters}
        minRating={minRating}
        setMinRating={setMinRating}
        promotionFrequencyFilters={promotionFrequencyFilters}
        setPromotionFrequencyFilters={setPromotionFrequencyFilters}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Competitors</h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? "Loading..." : `${filteredAndSortedCompetitors.length} competitors tracked`}
              </p>
            </div>

            <div className="flex gap-2">
              {/* FIX: Block opening modal until token ready */}
              <Button
                onClick={() => {
                  if (!stableToken) {
                    alert("Authenticating… try again");
                    return;
                  }
                  setShowAddModal(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Competitor
              </Button>

              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Grid
              </Button>

              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4 mr-2" /> Table
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="lg:hidden">
              <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
            </Button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="rating">Sort by Rating</option>
              <option value="price-low">Sort by Price (Low to High)</option>
              <option value="price-high">Sort by Price (High to Low)</option>
              <option value="promotion">Sort by Promotion Frequency</option>
              <option value="products">Sort by Tracked Products</option>
            </select>
          </div>
        </div>

        {/* Listing Area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground text-lg">Loading competitors...</p>
            </div>
          ) : filteredAndSortedCompetitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground text-lg">No competitors found</p>
              <p className="text-muted-foreground text-sm mt-2">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedCompetitors.map((competitor, idx) => (
                <CompetitorCard
                  key={idx}
                  competitor={competitor}
                  onClick={() => setSelectedCompetitor(competitor)}
                />
              ))}
            </div>
          ) : (
            <CompetitorTable
              competitors={filteredAndSortedCompetitors}
              onRowClick={(competitor) => setSelectedCompetitor(competitor)}
            />
          )}
        </div>
      </div>

      {selectedCompetitor && (
        <CompetitorModal
          competitor={selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
          onDelete={() => {
            if (!stableToken) return;

            const refresh = async () => {
              const response = await fetch("/api/competitors", {
                headers: { Authorization: `Bearer ${stableToken}` },
              });
              const result = await response.json();
              if (result.success) setCompetitors(result.data);
            };

            refresh();
          }}
        />
      )}

      <AddCompetitorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        isLoading={isAddingCompetitor}
        token = {stableToken!}
        setRefresher={setRefresher}
      />
    </div>
  );
}
