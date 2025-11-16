"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
    setRefresher?: () => void;

}

interface Competitor {
  id: string;
  name: string;
  logo?: string;
  firstTenItems?: { title: string; link: string }[];
}

export default function AddProductModal({
  open,
  onClose,
  onSuccess,
  setRefresher
}: AddProductModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [filter, setFilter] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] =
    useState<Competitor | null>(null);

  const [productUrl, setProductUrl] = useState("");
  const [topItems, setTopItems] = useState<{ title: string; link: string }[]>(
    []
  );
  const [selectedTopItem, setSelectedTopItem] = useState<string>("manual");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  const { user, token, loading: authLoading } = useCurrentUser();

  // -------------------------------------------------
  // Fetch Competitors
  // -------------------------------------------------
  useEffect(() => {
    if (!open || authLoading || !user || !token) return;

    const fetchCompetitors = async () => {
      setIsLoadingCompetitors(true);
      try {
        const res = await fetch("/api/competitors", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch competitors");

        const json = await res.json();
        if (json && Array.isArray(json.data)) setCompetitors(json.data);
      } catch (err) {
        console.error("Error fetching competitors:", err);
        setError("Failed to load competitors.");
      } finally {
        setIsLoadingCompetitors(false);
        setRefresher((prev) => !prev);
      }
    };

    fetchCompetitors();
  }, [open, authLoading, user, token]);

  // -------------------------------------------------
  // Reset modal state
  // -------------------------------------------------
  const reset = () => {
    setStep(1);
    setFilter("");
    setSelectedCompetitor(null);
    setProductUrl("");
    setTopItems([]);
    setSelectedTopItem("manual");
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const filteredCompetitors = competitors.filter((comp) =>
    comp.name.toLowerCase().includes(filter.toLowerCase())
  );

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // -------------------------------------------------
  // Select a competitor
  // -------------------------------------------------
  const handleSelectCompetitor = (comp: Competitor) => {
    setSelectedCompetitor(comp);
    setStep(2);
    setError(null);

    if (comp.firstTenItems && Array.isArray(comp.firstTenItems))
      setTopItems(comp.firstTenItems);
    else setTopItems([]);

    setSelectedTopItem("manual");
    setProductUrl("");
  };

  // -------------------------------------------------
  // Submit product URL
  // -------------------------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!selectedCompetitor) {
      setError("Please select a competitor");
      return;
    }
    if (!productUrl.trim()) {
      setError("Please enter a product URL");
      return;
    }
    if (!validateUrl(productUrl.trim())) {
      setError("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          competitor: selectedCompetitor.name,
          productUrl: productUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && data.error) || "Failed to save product");
      }

      onSuccess?.();
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Add Product</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <>
              <Label
                htmlFor="competitor-filter"
                className="text-sm font-medium"
              >
                Select Competitor
              </Label>
              <Input
                id="competitor-filter"
                placeholder="Filter competitors..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                disabled={isLoadingCompetitors}
                className="mt-2"
              />

              {isLoadingCompetitors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading competitors...
                  </span>
                </div>
              ) : filteredCompetitors.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {competitors.length === 0
                    ? "No competitors found."
                    : "No matches found"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {filteredCompetitors.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectCompetitor(comp)}
                      className="text-left rounded-lg border border-border p-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="font-medium text-foreground">
                        {comp.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Label className="text-sm font-medium">Competitor</Label>
              <div className="rounded-lg border border-border bg-muted/10 p-3">
                {selectedCompetitor?.name}
              </div>

              <Label htmlFor="product-url">Product URL</Label>

              {topItems.length > 0 && (
                <div className="mt-3 space-y-1 max-h-56 overflow-y-auto pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopItem("manual");
                      setProductUrl("");
                    }}
                    className={`w-full p-3 rounded-lg border-2 ${
                      selectedTopItem === "manual"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    ✏️ Manual URL
                  </button>

                  <div className="h-px bg-border"></div>

                  {topItems.map((it, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedTopItem(it.link);
                        setProductUrl(it.link);
                      }}
                      className={`w-full p-3 rounded-lg border-2 ${
                        selectedTopItem === it.link
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="font-medium text-sm truncate">
                          {it.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Input
                id="product-url"
                placeholder="https://www.ebay.ca/itm/..."
                value={productUrl}
                onChange={(e) => {
                  setProductUrl(e.target.value);
                  setSelectedTopItem("manual");
                }}
                className="mt-3"
              />

              {error && (
                <div className="text-sm text-red-500 p-3 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!productUrl.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
