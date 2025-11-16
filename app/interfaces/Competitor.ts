// types.ts
export interface Snapshot {
  productsCount?: number;
  avgPrice?: number | null;
  followers?: number;
  feedback?: string; // e.g., "99.9%"
  timestamp: number | string; // could be Date, number, or ISO string
  firstTenItems?: { title: string; link: string }[];
}

export interface Competitor {
  _id: string;
  name: string;
  logo?: string;
  tagline?: string;
  brandPositioning?: string;
  avgPriceRange?: string;
  promotionFrequency?: string;
  avgRating?: number | { $numberDouble: string };
  trackedProducts?: number | { $numberInt: string };
  description?: string;
  followers?: number | { $numberInt: string };
  storeUrl?: string;
  feedback?: string;
  firstTenItems?: { title: string; link: string }[];
  lastChecked?: Date | { $date: { $numberLong: string } };
  currentSnapshot?: Snapshot;
  pastSnapshots?: Snapshot[];
}
