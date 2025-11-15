"use client"

import { useState } from 'react'
import { X, Plus, Loader } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SellerInfo {
  store_url: string
  store_logo: string
  feedback: string | null
  items_sold: number | null
  followers: number | null
  first_10_items: Array<{ title: string | null; link: string | null }>
  last_checked: string
}

interface AddCompetitorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (url: string, sellerInfo?: SellerInfo) => void
  isLoading?: boolean
}

export function AddCompetitorModal({ isOpen, onClose, onAdd, isLoading = false }: AddCompetitorModalProps) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [isFetching, setIsFetching] = useState(false)

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = () => {
    setError("")

    if (!url.trim()) {
      setError("Please enter a seller URL")
      return
    }

    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`

    if (!validateUrl(urlWithProtocol)) {
      setError("Please enter a valid URL")
      return
    }

    fetchSellerInfo(urlWithProtocol)
  }

  const fetchSellerInfo = async (urlWithProtocol: string) => {
    setIsFetching(true)
    try {
      const response = await fetch("/api/competitors/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlWithProtocol }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch seller information")
        setIsFetching(false)
        return
      }

      const result = await response.json()
      onAdd(urlWithProtocol, result.data)
      setUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch seller information")
      setIsFetching(false)
    }
  }

  const handleClose = () => {
    setUrl("")
    setError("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Add Competitor</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isFetching}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seller-url" className="text-sm font-medium">
              Seller URL
            </Label>
            <Input
              id="seller-url"
              placeholder="https://example.com or example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isFetching) {
                  handleSubmit()
                }
              }}
              disabled={isFetching}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Enter the competitor's website URL. Include https:// or just the domain.
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
              <p className="text-sm text-blue-400">Fetching seller information...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isFetching}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isFetching}
            className="flex-1"
          >
            {isFetching ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              "Add Competitor"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
