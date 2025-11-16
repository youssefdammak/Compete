"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Snapshot {
  price: number;
  quantity_available: number;
  watchers_count: number;
  total_sold_listing: number;
  timestamp: string;
}

interface Product {
  id: string;
  name: string;
  pastSnapshots: Snapshot[];
}

interface ProductStatsProps {
  productName: string;
}

export default function ProductStats({ productName }: ProductStatsProps) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(
          `/api/products/${encodeURIComponent(productName)}`
        );
        const json = await res.json();
        if (json.success) setProduct(json.data);
      } catch (err) {
        console.error("Failed to fetch product:", err);
      }
    }

    fetchProduct();
  }, [productName]);

  if (!product) return <div>Loading...</div>;

  const snapshots = product.pastSnapshots.slice(0, 30).reverse();
  console.log("Product Snapshots:", snapshots);

  // Price Chart
  const priceChartData = snapshots.map((snap, idx) => ({
    timestamp: new Date(snap.timestamp).toLocaleString(),
    price: snap.price,
  }));

  // Quantity Available Chart
  const quantityChartData = snapshots.map((snap, idx) => ({
    timestamp: new Date(snap.timestamp).toLocaleString(),
    quantity: snap.quantity_available,
  }));

  // Watchers Chart
  const watchersChartData = snapshots.map((snap) => ({
    timestamp: new Date(snap.timestamp).toLocaleString(),
    watchers: snap.watchers_count,
  }));

  // Total Sold Chart
  const soldChartData = snapshots.map((snap) => ({
    timestamp: new Date(snap.timestamp).toLocaleString(),
    sold: snap.total_sold_listing,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Price Trend */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">
          {product.name} Price Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={priceChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Quantity Available */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">
          {product.name} Quantity Available
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={quantityChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="quantity"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Watchers Count */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">{product.name} Watchers</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={watchersChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="watchers"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Total Sold */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">
          {product.name} Total Sold
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={soldChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="timestamp" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="sold"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
