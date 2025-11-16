"use client";

import { useState, useEffect } from "react";
import { Search, Grid3x3, List, SlidersHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/product-card";
import ProductRow from "@/components/product-row";
import ProductModal from "@/components/product-modal";
import ProductFilterSidebar from "@/components/product-filter-sidebar";
import PillFilters from "@/components/pill-filters";
import SortDropdown from "@/components/sort-dropdown";
import AddProductModal from "@/components/ui/add-product-modal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
export type Product = {
  id: string;
  name: string;
  competitor: string;
  currentPrice: number;
  currency?: string;
  ebay_item_id?: string;
  shipping_cost?: number;
  images?: string[];
  originalPrice?: number;
  stock: "In Stock" | "Low Stock" | "Out of Stock";
  rating: number;
  reviewCount: number;
  isDiscounted: boolean;
  discountPercent?: number;
  image: string;
  priceHistory: number[];
  last_24_hours: string; // ⭐ TEXT ONLY
  watchers_count: number; // ⭐ NUMBER
  condition?: string;
  quantity_available?: number;
  total_sold_listing?: number;
  category: string;
  lastUpdated: string;
  description: string;
  product_url: string;
};

type ViewMode = "grid" | "list";
type SortOption = "price-asc" | "price-desc" | "rating" | "recent";

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, token, loading: authLoading } = useCurrentUser();
  const [stableToken, setStableToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && token) {
      console.log("🔐 Stable token ready:", token);
      setStableToken(token);
    }
  }, [authLoading, token]);
  // Filters
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [minRating, setMinRating] = useState(0);
  const [stockFilter, setStockFilter] = useState<string[]>([]);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);
  const [refresher, setRefresher] = useState(false);

  // Quick filters
  const [quickFilters, setQuickFilters] = useState({
    inStock: false,
    discounted: false,
    rating4Plus: false,
  });

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/products", {
          headers: { Authorization: `Bearer ${stableToken}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [refresher, stableToken]);

  // Fetch competitors for filters
  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        const res = await fetch("/api/competitors", {
          headers: { Authorization: `Bearer ${stableToken}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          const names = json.data.map((c: any) => c.name).filter(Boolean);
          setCompetitors(names);
        }
      } catch (err) {
        console.error("Error fetching competitors:", err);
      }
    };

    fetchCompetitors();
  }, []);

  // Filter and sort products
  const filteredProducts = products.filter((product) => {
    // Search
    if (
      searchQuery &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !product.competitor.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Competitors
    if (
      selectedCompetitors.length > 0 &&
      !selectedCompetitors.includes(product.competitor)
    ) {
      return false;
    }

    // Price range
    if (
      product.currentPrice < priceRange[0] ||
      product.currentPrice > priceRange[1]
    ) {
      return false;
    }

    // Rating
    if (product.rating < minRating) {
      return false;
    }

    // Stock
    if (stockFilter.length > 0 && !stockFilter.includes(product.stock)) {
      return false;
    }

    // Discount
    if (showDiscountedOnly && !product.isDiscounted) {
      return false;
    }

    // Quick filters
    if (quickFilters.inStock && product.stock !== "In Stock") {
      return false;
    }
    if (quickFilters.discounted && !product.isDiscounted) {
      return false;
    }
    if (quickFilters.rating4Plus && product.rating < 4) {
      return false;
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.currentPrice - b.currentPrice;
      case "price-desc":
        return b.currentPrice - a.currentPrice;
      case "rating":
        return b.rating - a.rating;
      case "recent":
      default:
        return 0;
    }
  });

  const handleAddProductSuccess = async () => {
    // Refresh products list after adding
    try {
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${stableToken}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data);
        }
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Filter Sidebar */}
      <ProductFilterSidebar
        open={filterSidebarOpen}
        competitors={competitors}
        selectedCompetitors={selectedCompetitors}
        onCompetitorsChange={setSelectedCompetitors}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        showDiscountedOnly={showDiscountedOnly}
        onShowDiscountedOnlyChange={setShowDiscountedOnly}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Products</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading
                  ? "Loading..."
                  : `${sortedProducts.length} products found`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAddProductModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>

          {/* Quick Pill Filters */}
          <PillFilters
            filters={quickFilters}
            onFiltersChange={setQuickFilters}
          />
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground text-lg">
                Loading products...
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}

          {!isLoading && sortedProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground text-lg">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onDelete={handleAddProductSuccess}
        />
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={handleAddProductSuccess}
        setRefresher={setRefresher}
      />
    </div>
  );
}
