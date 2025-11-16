"use client";

import { useState } from "react";
import { X, Plus, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  setRefresher: () => void;
}

export function AddCompetitorModal({
  isOpen,
  onClose,
  token,
  setRefresher,
}: AddCompetitorModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const handleSubmit = () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter a competitor name");
      return;
    }

    // Normalize the competitor name by removing spaces
    const normalized = name.trim().replace(/\s+/g, "");

    // Construct the final eBay store URL
    const storeUrl = `https://www.ebay.ca/str/${normalized}`;

    fetchSellerInfo(storeUrl);
  };

  const fetchSellerInfo = async (storeUrl: string) => {
    setIsFetching(true);

    try {
      const response = await fetch("/api/competitors/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: storeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch seller information");
        return;
      }

      // Success — clear input and close modal
      await response.json();
      setName("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch seller information"
      );
    } finally {
      setIsFetching(false);
      setRefresher((prev) => !prev);
    }
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Add Competitor
            </h2>
          </div>

          {/* CLOSE BUTTON — always enabled */}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competitor-name" className="text-sm font-medium">
              Competitor Name
            </Label>

            <Input
              id="competitor-name"
              placeholder="e.g. AdidasCanada"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isFetching) handleSubmit();
              }}
              disabled={false} // can type while fetching too
            />

            <p className="text-xs text-muted-foreground">
              Enter the competitor’s eBay store name. We will generate:
              <br />
              <code className="text-muted-foreground">
                https://www.ebay.ca/str/{name || "<name>"}
              </code>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {isFetching && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin text-blue-400" />
              <p className="text-sm text-blue-400">Adding competitor…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          {/* CANCEL — always enabled */}
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>

          {/* SUBMIT */}
          <Button onClick={handleSubmit} className="flex-1" disabled={false}>
            {isFetching ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Competitor"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
