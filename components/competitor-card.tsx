import { Star, Package, TrendingUp } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Competitor } from "@/app/competitors/page"

interface CompetitorCardProps {
  competitor: Competitor
  onClick: () => void
}

export function CompetitorCard({ competitor, onClick }: CompetitorCardProps) {
  const positioningColors = {
    premium: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    budget: "bg-green-500/10 text-green-400 border-green-500/20",
    niche: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  }

  const promoColors = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20"
  }

  return (
    <Card
      className="p-6 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
      onClick={onClick}
    >
      {/* Logo and Title */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={competitor.logo || "/placeholder.svg"}
          alt={`${competitor.name} logo`}
          className="w-16 h-16 rounded-lg bg-muted object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground">{competitor.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{competitor.tagline}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className={positioningColors[competitor.brandPositioning]}>
          {competitor.brandPositioning}
        </Badge>
        <Badge variant="outline" className={promoColors[competitor.promotionFrequency]}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {competitor.promotionFrequency} promo
        </Badge>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Avg Rating</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-foreground">{competitor.avgRating}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Items Sold</span>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{competitor.trackedProducts?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Followers</span>
          <span className="text-sm font-medium text-foreground">{competitor.followers?.toLocaleString() || "N/A"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Feedback</span>
          <span className="text-sm font-medium text-foreground">{competitor.feedback || "N/A"}</span>
        </div>
      </div>
    </Card>
  )
}
