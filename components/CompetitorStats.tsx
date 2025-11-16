"use client";

import { Competitor } from "@/app/interfaces/Competitor";
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

interface CompetitorStatsProps {
  competitor: Competitor;
}

export default function CompetitorStats({ competitor }: CompetitorStatsProps) {
    console.log("Competitor Data:", competitor);
  // Combine pastSnapshots + currentSnapshot
  const snapshots = [
    ...(competitor.pastSnapshots || []),
    competitor.currentSnapshot || {},
  ];

  // Map snapshots to chart-friendly data
  const chartData = snapshots
    .filter((s) => s.timestamp) // ensure timestamp exists
    .map((s, idx) => ({
      snapshot: `Snapshot ${idx + 1}`,
      productsCount: s.productsCount ?? 0,
      avgPrice: s.avgPrice ?? 0,
      followers: s.followers ?? 0,
      feedback: parseFloat(s.feedback?.replace("%", "") || "0"), // convert "99.9%" -> 99.9
    }));
console.log("Chart Data:", chartData);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Products Count */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">Products Count</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="snapshot" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="productsCount"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      

      {/* Followers */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">Followers</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="snapshot" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="followers"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Feedback */}
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-4">Feedback (%)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="snapshot" stroke="#888" />
            <YAxis stroke="#888" domain={[0, 100]} />
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Line
              type="monotone"
              dataKey="feedback"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
