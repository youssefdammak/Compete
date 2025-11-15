import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

const integrations = [
  {
    id: 1,
    name: "Google",
    description: "Connect your Google account for calendar sync",
    icon: "https://www.google.com/favicon.ico",
    connected: true,
    connectedDate: "Jan 10, 2024",
  },
  {
    id: 2,
    name: "GitHub",
    description: "Link your GitHub repositories",
    icon: "https://github.com/favicon.ico",
    connected: true,
    connectedDate: "Jan 5, 2024",
  },
  {
    id: 3,
    name: "Slack",
    description: "Get notifications in your Slack workspace",
    icon: "https://slack.com/favicon.ico",
    connected: false,
    connectedDate: null,
  },
  {
    id: 4,
    name: "Stripe",
    description: "Connect Stripe for payment processing",
    icon: "https://stripe.com/favicon.ico",
    connected: true,
    connectedDate: "Dec 20, 2023",
  },
  {
    id: 5,
    name: "Zapier",
    description: "Automate workflows with Zapier",
    icon: "https://zapier.com/favicon.ico",
    connected: false,
    connectedDate: null,
  },
  {
    id: 6,
    name: "Discord",
    description: "Send alerts to your Discord server",
    icon: "https://discord.com/favicon.ico",
    connected: false,
    connectedDate: null,
  },
];

export function ConnectedAppsGrid() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Modal logic omitted for brevity; add if you want real connect/disconnect

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {integrations.map((app) => (
        <Card key={app.id} className="border-border/50 bg-card p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
                  <img src={app.icon || "/placeholder.svg"} alt={app.name} className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold">{app.name}</h4>
                  {app.connected && (
                    <Badge
                      variant="secondary"
                      className="mt-1 bg-green-500/10 text-green-500"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{app.description}</p>
            {app.connected && app.connectedDate && (
              <p className="text-xs text-muted-foreground">
                Connected on {app.connectedDate}
              </p>
            )}
            <Button
              variant={app.connected ? "outline" : "default"}
              size="sm"
              className="w-full"
              // onClick={() => handleConnect(app)}
            >
              {app.connected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
