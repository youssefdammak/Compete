/**
 * Types for ad funnel exploration results.
 * These are exported from `types/funnel.ts` so they can be used
 * in API routes and React components.
 */

export type FunnelStepType =
	| "ad"
	| "landing"
	| "product"
	| "cart"
	| "checkout"
	| "upsell"
	| "other"

export interface FunnelStep {
	id: string
	type: FunnelStepType
	url: string
	title?: string
	notes?: string
	/** Price at this step (if applicable). Null when explicit missing. */
	price?: number | null
	/** Currency for the price, e.g. "USD" — null when unknown. */
	currency?: string | null
	/** Optional screenshot URL for this step */
	screenshotUrl?: string
	/** Order of the step within the run (starting at 0 or 1 depending on producer) */
	order: number
}

export interface FunnelRun {
	id: string
	competitor: string
	query: string
	createdAt: string
	steps: FunnelStep[]
	/** Final price captured for the run (if any) */
	finalPrice?: number | null
	/** Currency for the finalPrice */
	currency?: string | null
}

