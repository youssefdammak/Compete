'use client'
import { Competitor } from '@/app/interfaces/Competitor'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, ChartLine } from 'lucide-react'



export default function TrendsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        const response = await fetch('/api/competitors')
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            setCompetitors(result.data)
            console.log("Fetched Competitors:", result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching competitors:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompetitors()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading trends...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ChartLine className="h-8 w-8" />
          Competitor Trends
        </h1>
        <p className="text-muted-foreground">
          Track pricing, discounts, and performance metrics for each competitor over time
        </p>
      </div>

      {/* Competitors Grid */}
      {competitors.length === 0 ? (
        <Card className="p-8 text-center border-border bg-card">
          <p className="text-muted-foreground mb-4">No competitors added yet</p>
          <Link href="/competitors">
            <Button>Go to Competitors</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((competitor) => (
            <Link key={competitor._id} href={`/trends/${competitor._id}`}>
              <Card className="p-6 border-border bg-card hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-4 mb-4">
                  {competitor.logo && (
                    <img
                      src={competitor.logo}
                      alt={competitor.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg truncate">{competitor.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {competitor.trackedProducts || 0} products tracked
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <span className="font-semibold">{competitor.avgRating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Followers</span>
                    <span className="font-semibold">{competitor.followers?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Last updated:{' '}
                    {competitor.lastChecked
  ? new Date(competitor.lastChecked).toLocaleDateString()
  : 'Never'}
                  </p>
                </div>

                {/* View Button */}
                <Button className="w-full mt-4 gap-2">
                  <TrendingUp className="h-4 w-4" />
                  View Trends
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
