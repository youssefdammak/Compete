import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet } from 'lucide-react';

const securityLogs = [
  {
    id: 1,
    date: "2025-01-15 14:32:10",
    device: "Chrome on Windows",
    browser: "Chrome 120",
    location: "New York, US",
    status: "success",
    icon: Monitor,
  },
  {
    id: 2,
    date: "2025-01-15 09:15:23",
    device: "Safari on iPhone",
    browser: "Safari 17",
    location: "New York, US",
    status: "success",
    icon: Smartphone,
  },
  {
    id: 3,
    date: "2025-01-14 18:45:00",
    device: "Chrome on MacBook",
    browser: "Chrome 120",
    location: "Boston, US",
    status: "success",
    icon: Monitor,
  },
  {
    id: 4,
    date: "2025-01-14 12:20:11",
    device: "Firefox on Windows",
    browser: "Firefox 121",
    location: "Seattle, US",
    status: "failed",
    icon: Monitor,
  },
  {
    id: 5,
    date: "2025-01-13 22:10:35",
    device: "Safari on iPad",
    browser: "Safari 17",
    location: "New York, US",
    status: "success",
    icon: Tablet,
  },
];

export function SecurityActivityTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Device / Browser</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {securityLogs.map((log) => {
            const Icon = log.icon;
            return (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">{log.date}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{log.device}</p>
                      <p className="text-xs text-muted-foreground">{log.browser}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{log.location}</TableCell>
                <TableCell>
                  <Badge
                    variant={log.status === "success" ? "default" : "destructive"}
                    className={log.status === "success" ? "bg-green-500/10 text-green-500" : ""}
                  >
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-6 space-y-3 border-t border-border pt-6">
        <h4 className="text-sm font-semibold">Active Sessions</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Chrome on Windows (Current)</p>
                <p className="text-xs text-muted-foreground">New York, US · Active now</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-500/10 text-green-500">Active</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Safari on iPhone</p>
                <p className="text-xs text-muted-foreground">New York, US · 5 hours ago</p>
              </div>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
