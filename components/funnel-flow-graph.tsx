"use client"

import React, { useState } from "react"
import { Megaphone, Globe, Package, ShoppingCart, CreditCard, MoreHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type FunnelStepType =
  | "ad"
  | "landing"
  | "product"
  | "cart"
  | "checkout"
  | "other"

export interface FunnelStep {
  id: string
  type: FunnelStepType
  url: string
  title: string | null
  notes: string | null
  price: number | null
  currency: string | null
  screenshotUrl?: string | null
}

export interface FunnelData {
  steps: FunnelStep[]
  finalPrice: number | null
  currency: string | null
}

export type FunnelResult = FunnelData

export const mockFunnelData: FunnelData = {
  steps: [],
  finalPrice: null,
  currency: null,
}

const stepTypeConfig: Record<
  FunnelStepType,
  {
    icon: React.ComponentType<{
      width?: number | string
      height?: number | string
      stroke?: string
      strokeWidth?: number | string
      fill?: string
    }>
    color: string
    bgColor: string
  }
> = {
  ad: { icon: Megaphone, color: "#eab308", bgColor: "rgba(234, 179, 8, 0.15)" },
  landing: { icon: Globe, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.15)" },
  product: { icon: Package, color: "#a855f7", bgColor: "rgba(168, 85, 247, 0.15)" },
  cart: { icon: ShoppingCart, color: "#f97316", bgColor: "rgba(249, 115, 22, 0.15)" },
  checkout: { icon: CreditCard, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)" },
  other: { icon: MoreHorizontal, color: "#6b7280", bgColor: "rgba(107, 114, 128, 0.15)" },
}

type FunnelFlowGraphProps = {
  data: FunnelData
}

export default function FunnelFlowGraph({ data }: FunnelFlowGraphProps) {
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(null)
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  const nodeWidth = 180
  const nodeHeight = 120
  const horizontalGap = 140
  const leftPadding = 60
  const rightPadding = 40
  const baseY = 200
  const waveAmplitude = 40

  const getNodeY = (index: number) => baseY + Math.sin(index * 0.8) * waveAmplitude

  const totalWidth = leftPadding + data.steps.length * nodeWidth + Math.max(0, (data.steps.length - 1) * horizontalGap) + rightPadding
  const totalHeight = 500

  return (
    <>
      <div className="w-full bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto p-8">
        {(!data.steps || data.steps.length === 0) ? (
          <div className="w-full py-12 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium">Run an exploration to see a competitor ad funnel.</h3>
              <p className="text-sm text-muted-foreground mt-2">Enter a competitor and query above, then run the exploration.</p>
            </div>
          </div>
        ) : (
          <svg width={totalWidth} height={totalHeight} className="min-w-full">
          <defs>
            {Object.entries(stepTypeConfig).map(([type, config]) => (
              <marker
                key={`arrow-${type}`}
                id={`arrow-${type}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill={config.color} />
              </marker>
            ))}
          </defs>

          {/* connectors */}
          {data.steps.map((step, index) => {
            if (index === data.steps.length - 1) return null
            const config = stepTypeConfig[step.type]
            const x1 = index * (nodeWidth + horizontalGap) + nodeWidth + leftPadding
            const y1 = getNodeY(index) + nodeHeight / 2
            const x2 = (index + 1) * (nodeWidth + horizontalGap) + leftPadding
            const y2 = getNodeY(index + 1) + nodeHeight / 2
            const midX = (x1 + x2) / 2
            const curveOffset = 30

            return (
              <g key={`connector-${step.id}`}>
                <path
                  d={`M ${x1} ${y1} C ${midX - curveOffset} ${y1}, ${midX + curveOffset} ${y2}, ${x2} ${y2}`}
                  stroke={config.color}
                  strokeWidth={4}
                  fill="none"
                  markerEnd={`url(#arrow-${step.type})`}
                  opacity={0.6}
                />
              </g>
            )
          })}

          {/* nodes */}
          {data.steps.map((step, index) => {
            const config = stepTypeConfig[step.type]
            const Icon = config.icon
            const x = index * (nodeWidth + horizontalGap) + leftPadding
            const y = getNodeY(index)
            const isHovered = hoveredStep === step.id

            // scale around center so it grows in place
            const scale = isHovered ? 1.06 : 1
            const groupTransform = `translate(${x}, ${y}) translate(${nodeWidth / 2}, ${nodeHeight / 2}) scale(${scale}) translate(${-nodeWidth / 2}, ${-nodeHeight / 2})`

            return (
              <g
                key={step.id}
                transform={groupTransform}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => setSelectedStep(step)}
                className="cursor-pointer"
                style={{ transition: "transform 0.18s" }}
              >
                <rect width={nodeWidth} height={nodeHeight} rx={12} fill="white" stroke={config.color} strokeWidth={isHovered ? 3 : 2} />

                <g transform={`translate(0, 0)`}> 
                  <circle cx={-10} cy={-10} r={18} fill={config.color} stroke="white" strokeWidth={3} />
                  <text x={-10} y={-5} textAnchor="middle" className="fill-white font-bold text-sm">{index + 1}</text>
                </g>

                <rect x={12} y={12} width={nodeWidth - 24} height={28} rx={6} fill={config.bgColor} />

                <g transform={`translate(${nodeWidth / 2 - 30}, 20)`}>
                  <Icon width={16} height={16} stroke={config.color} strokeWidth={2} fill="none" />
                </g>
                <text x={nodeWidth / 2 + 5} y={30} className="text-xs font-semibold" fill={config.color}>
                  {step.type === "ad" && "Ad"}
                  {step.type === "landing" && "Landing"}
                  {step.type === "product" && "Product"}
                  {step.type === "cart" && "Cart"}
                  {step.type === "checkout" && "Checkout"}
                  {step.type === "other" && "Other"}
                </text>

                <text x={nodeWidth / 2} y={58} textAnchor="middle" className="text-sm font-semibold fill-slate-800">
                  {step.title && step.title.length > 20 ? step.title.substring(0, 20) + "..." : step.title || "Untitled"}
                </text>

                {typeof step.price === "number" && (
                  <text x={nodeWidth / 2} y={80} textAnchor="middle" className="text-xs font-medium fill-slate-600">{step.currency} ${step.price.toFixed(2)}</text>
                )}

                <text x={nodeWidth / 2} y={105} textAnchor="middle" className="text-xs fill-slate-400" opacity={isHovered ? 1 : 0}>Click for details</text>
              </g>
            )
          })}
        </svg>
          )}
      </div>

      {selectedStep && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedStep(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: stepTypeConfig[selectedStep.type].bgColor }}>
                  {(() => {
                    const Icon = stepTypeConfig[selectedStep.type].icon
                    return <Icon width={24} height={24} stroke={stepTypeConfig[selectedStep.type].color} />
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: stepTypeConfig[selectedStep.type].bgColor, color: stepTypeConfig[selectedStep.type].color }}>{selectedStep.type.toUpperCase()}</span>
                    {typeof selectedStep.price === "number" && (<span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{selectedStep.currency} ${selectedStep.price.toFixed(2)}</span>)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStep.title || "Untitled Step"}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(selectedStep.url, "_blank")}>Open in new tab</Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedStep(null)} className="shrink-0"><X className="w-5 h-5" /></Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">URL</h3>
                <a href={selectedStep.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{selectedStep.url}</a>
              </div>

              {selectedStep.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedStep.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

