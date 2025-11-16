'use client'

import { useState, useMemo, useEffect } from 'react'
import { EventFilterBar } from '@/components/event-filter-bar'
import { EventItem } from '@/components/event-item'
import { EventStats } from '@/components/event-stats'
import { updateCompetitor } from '@/jobs/updateCompetitors'

export type EventType = 'price_drop' | 'price_increase' | 'stock_change' | 'alert' | 'new_product'

export interface Event {
  id: string
  type: EventType
  productName: string
  competitorName: string
  description: string
  timestamp: Date
  metadata?: {
    oldPrice?: number
    newPrice?: number
    oldStock?: string
    newStock?: string
  }
}

// Mock event data
const mockEvents: Event[] = [
  {
    id: '1',
    type: 'price_drop',
    productName: 'Smart Watch Pro',
    competitorName: 'TechGiant',
    description: 'Price dropped from $299 → $249',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    metadata: { oldPrice: 299, newPrice: 249 }
  },
  {
    id: '2',
    type: 'stock_change',
    productName: 'Wireless Earbuds Max',
    competitorName: 'AudioTech',
    description: 'Stock status changed from In Stock → Low Stock',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    metadata: { oldStock: 'In Stock', newStock: 'Low Stock' }
  },
  {
    id: '3',
    type: 'alert',
    productName: 'Laptop Ultra 15"',
    competitorName: 'CompWorld',
    description: 'Price alert triggered: Below target price of $1200',
    timestamp: new Date(Date.now() - 23 * 60 * 1000)
  },
  {
    id: '4',
    type: 'price_increase',
    productName: 'Smart Watch Pro',
    competitorName: 'ElectroHub',
    description: 'Price increased from $279 → $299',
    timestamp: new Date(Date.now() - 35 * 60 * 1000),
    metadata: { oldPrice: 279, newPrice: 299 }
  },
  {
    id: '5',
    type: 'new_product',
    productName: 'Gaming Mouse RGB',
    competitorName: 'TechGiant',
    description: 'New product added to catalog at $89',
    timestamp: new Date(Date.now() - 48 * 60 * 1000)
  },
  {
    id: '6',
    type: 'price_drop',
    productName: 'Mechanical Keyboard',
    competitorName: 'AudioTech',
    description: 'Price dropped from $159 → $139',
    timestamp: new Date(Date.now() - 65 * 60 * 1000),
    metadata: { oldPrice: 159, newPrice: 139 }
  },
  {
    id: '7',
    type: 'stock_change',
    productName: 'USB-C Hub',
    competitorName: 'CompWorld',
    description: 'Stock status changed from Low Stock → In Stock',
    timestamp: new Date(Date.now() - 92 * 60 * 60 * 1000),
    metadata: { oldStock: 'Low Stock', newStock: 'In Stock' }
  },
  {
    id: '8',
    type: 'alert',
    productName: 'Portable SSD 1TB',
    competitorName: 'TechGiant',
    description: 'Stock alert triggered: Item back in stock',
    timestamp: new Date(Date.now() - 110 * 60 * 60 * 1000)
  },
  {
    id: '9',
    type: 'price_drop',
    productName: 'Monitor 4K 27"',
    competitorName: 'ElectroHub',
    description: 'Price dropped from $449 → $399',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    metadata: { oldPrice: 449, newPrice: 399 }
  },
  {
    id: '10',
    type: 'price_increase',
    productName: 'Webcam HD Pro',
    competitorName: 'AudioTech',
    description: 'Price increased from $79 → $89',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    metadata: { oldPrice: 79, newPrice: 89 }
  },
  {
    id: '11',
    type: 'new_product',
    productName: 'Desk Lamp Smart',
    competitorName: 'CompWorld',
    description: 'New product added to catalog at $45',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    id: '12',
    type: 'price_drop',
    productName: 'Bluetooth Speaker',
    competitorName: 'ElectroHub',
    description: 'Price dropped from $129 → $99',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    metadata: { oldPrice: 129, newPrice: 99 }
  }
]

export default function LiveFeedPage() {
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([])
  const [selectedCompetitor, setSelectedCompetitor] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'feed' | 'condensed'>('feed')

  useEffect(() => {
    updateCompetitor('https://www.ebay.ca/str/surplusbydesign')
  }, []);

  // Filter events based on selections
  const filteredEvents = useMemo(() => {
    let filtered = [...mockEvents]

    // Time range filter
    const now = Date.now()
    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }
    
    if (timeRanges[timeRange]) {
      filtered = filtered.filter(
        (event) => now - event.timestamp.getTime() <= timeRanges[timeRange]
      )
    }

    // Event type filter
    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter((event) =>
        selectedEventTypes.includes(event.type)
      )
    }

    // Competitor filter
    if (selectedCompetitor !== 'all') {
      filtered = filtered.filter(
        (event) => event.competitorName === selectedCompetitor
      )
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((event) =>
        event.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [timeRange, selectedEventTypes, selectedCompetitor, searchQuery])

  // Get unique competitors
  const competitors = useMemo(() => {
    return Array.from(new Set(mockEvents.map((e) => e.competitorName)))
  }, [])

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Live Feed</h1>
          <p className="text-muted-foreground">
            Real-time market activity and competitor updates
          </p>
        </div>

        {/* Filter Bar */}
        <EventFilterBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          selectedEventTypes={selectedEventTypes}
          onEventTypesChange={setSelectedEventTypes}
          selectedCompetitor={selectedCompetitor}
          onCompetitorChange={setSelectedCompetitor}
          competitors={competitors}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Stats Panel */}
        <EventStats events={filteredEvents} timeRange={timeRange} />

        {/* Event Feed */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Activity Feed
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} events found
            </p>
          </div>
          <div className="divide-y divide-border">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  viewMode={viewMode}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  No events found
                </p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
