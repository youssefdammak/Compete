import {
  X,
  Star,
  Package,
  TrendingUp,
  ExternalLink,
  Link as LinkIcon,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Competitor } from "@/app/interfaces/Competitor";
import { useState } from "react";

interface CompetitorModalProps {
  competitor: Competitor;
  onClose: () => void;
  onDelete?: () => void;
}

export function CompetitorModal({
  competitor,
  onClose,
  onDelete,
}: CompetitorModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRefreshCompetitor = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/competitors?id=${competitor._id}`, {
        method: "PATCH"
      });

      if (response.ok) {
        // Trigger a refresh in the parent component
        onDelete?.();
        onClose();
      } else {
        alert("Failed to refresh competitor");
      }
    } catch (error) {
      console.error("Error refreshing competitor:", error);
      alert("Error refreshing competitor");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/competitors?id=${competitor._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.();
        onClose();
      } else {
        alert("Failed to delete competitor");
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Error deleting competitor:", error);
      alert("Error deleting competitor");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const positioningColors = {
    premium: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    budget: "bg-green-500/10 text-green-400 border-green-500/20",
    niche: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const promoColors = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`
        .competitor-modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .competitor-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .competitor-modal-scroll::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.5);
          border-radius: 4px;
        }
        .competitor-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.8);
        }
      `}</style>
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <img
              src={competitor.logo || "/placeholder.svg"}
              alt={`${competitor.name} logo`}
              className="w-20 h-20 rounded-lg bg-muted object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-foreground truncate">
                {competitor.name}
              </h2>
              <p className="text-muted-foreground mt-1 line-clamp-2">
                {competitor.tagline}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge
                  variant="outline"
                  className={positioningColors[competitor.brandPositioning]}
                >
                  {competitor.brandPositioning}
                </Badge>
                <Badge
                  variant="outline"
                  className={promoColors[competitor.promotionFrequency]}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {competitor.promotionFrequency}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto competitor-modal-scroll">
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Overview
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {competitor.description}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  Average Rating
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <span className="text-xl font-semibold text-foreground">
                    {competitor.avgRating}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5.0</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  Items Sold
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xl font-semibold text-foreground">
                    {competitor.trackedProducts?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  Followers
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {competitor.followers?.toLocaleString() || "N/A"}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  Feedback
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {competitor.feedback || "N/A"}
                </div>
              </div>
            </div>

            {/* Top Products */}
            {competitor.firstTenItems &&
              competitor.firstTenItems.length > 0 && (
                <div className="border border-border rounded-lg bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Top Products ({competitor.firstTenItems.length})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2 competitor-modal-scroll">
                    {competitor.firstTenItems.map((product, index) => (
                      <a
                        key={index}
                        href={product.link || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {product.title || "Untitled Product"}
                          </p>
                          {product.link && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {new URL(product.link).hostname}
                            </p>
                          )}
                        </div>
                        <LinkIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Last Checked */}
            {competitor.lastChecked && (
              <div className="text-xs text-muted-foreground p-3 rounded bg-muted/30">
                Last checked:{" "}
                {new Date(competitor.lastChecked).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-6 border-t border-border space-y-3">
          {showDeleteConfirm && (
            <div className="flex gap-2 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
              <span className="flex-1 text-sm font-semibold text-foreground py-2">
                Delete this competitor?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "..." : "Yes"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRefreshCompetitor}
              disabled={isRefreshing || isDeleting || showDeleteConfirm}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteClick}
              disabled={isDeleting || showDeleteConfirm || isRefreshing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            {competitor.storeUrl && (
              <Button className="flex-1" asChild>
                <a
                  href={competitor.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Store
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
