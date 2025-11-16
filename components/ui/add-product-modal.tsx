"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Competitor {
  id: string;
  name: string;
  logo?: string;
}

export default function AddProductModal({
  open,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [filter, setFilter] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(
    null
  );
  const [productUrl, setProductUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  // Fetch competitors from database
  useEffect(() => {
    if (open) {
      const fetchCompetitors = async () => {
        try {
          setIsLoadingCompetitors(true);
          const response = await fetch("/api/competitors");

          if (!response.ok) {
            throw new Error("Failed to fetch competitors");
          }

          const result = await response.json();
          if (result.success && result.data) {
            setCompetitors(result.data);
          }
        } catch (error) {
          console.error("Error fetching competitors:", error);
          setError("Failed to load competitors. Please try again.");
        } finally {
          setIsLoadingCompetitors(false);
        }
      };

      fetchCompetitors();
    }
  }, [open]);

  const reset = () => {
    setStep(1);
    setFilter("");
    setSelectedCompetitor(null);
    setProductUrl("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  if (!open) return null;

  const filtered = competitors.filter((comp) =>
    comp.name.toLowerCase().includes(filter.toLowerCase())
  );

  const validateUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSelectCompetitor = (compName: string) => {
    setSelectedCompetitor(compName);
    setStep(2);
    setError(null);
  };

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
      // Pass competitor name and productUrl directly to the products endpoint
      // The backend will handle scraping internally
      const saveRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor: selectedCompetitor,
          productUrl: productUrl.trim(),
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => null);
        throw new Error((data && data.error) || "Failed to save product");
      }

      const result = await saveRes.json();
      console.log("✅ Product saved:", result);

      onSuccess?.();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("AddProductModal error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Add Product</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
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
                  className="mt-2"
                  disabled={isLoadingCompetitors}
                />
              </div>

              {isLoadingCompetitors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading competitors...
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {competitors.length === 0
                      ? "No competitors found. Please add competitors first."
                      : "No matches found"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {filtered.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectCompetitor(comp.name)}
                      className="text-left rounded-lg border border-border p-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="font-medium text-foreground">
                        {comp.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Competitor</Label>
                <div className="mt-2">
                  <div className="rounded-lg border border-border bg-muted/10 p-3">
                    {selectedCompetitor}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="product-url">Product URL</Label>
                <Input
                  id="product-url"
                  placeholder="https://www.ebay.ca/itm/..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  disabled={isSubmitting}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the product link to scrape details.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !productUrl.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
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
