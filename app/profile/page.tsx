"use client";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User, Mail, Phone, Globe, Clock, Languages, Edit, Shield, Bell, Moon, Download, AlertTriangle, CreditCard, Monitor, MapPin, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import { SecurityActivityTable } from "@/components/security-activity-table";
import { ConnectedAppsGrid } from "@/components/connected-apps-grid";

export default function ProfilePage() {
  const { user } = useAuth();
  // Fake company state for now
  const [company, setCompany] = useState({
    name: "Acme Corp",
    sellerUrl: "https://acme.com/seller/12345"
  });
  const [editUrl, setEditUrl] = useState(company.sellerUrl);
  const [editing, setEditing] = useState(false);

  // Load phone from localStorage if available
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`user_phone_${user.uid}`);
      if (stored) setPhone(stored);
    }
  }, [user]);

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">No user is logged in.</div>;
  }

  // Format join date and last login
  const joinDate = user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "-";
  const lastLogin = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : "-";
  const emailVerified = user.emailVerified;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>Settings</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">My Profile</span>
      </div>

      {/* Page Title */}
      <h1 className="mb-8 text-3xl font-bold">My Profile</h1>

      <div className="space-y-6">
        {/* User Overview Header */}
        <Card className="border-border/50 bg-card p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.photoURL || "/professional-avatar.png"} />
                <AvatarFallback>{user.displayName ? user.displayName.split(" ").map((n) => n[0]).join("") : user.email?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-semibold">{user.displayName || "No Name"}</h2>
                  <p className="text-muted-foreground">@{user.email?.split("@")[0]}</p>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                    Pro Plan
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                    Admin
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Joined: {joinDate}</p>
                  <p>Last active: {lastLogin}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <Shield className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </div>
          </div>
        </Card>

        {/* Personal Information */}
        <Card className="border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="mb-6" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Full Name
              </label>
              <p className="text-foreground">{user.displayName || "No Name"}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-foreground">{user.email}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <p className="text-foreground">{phone || "-"}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                Country
              </label>
              <p className="text-foreground">United States</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Timezone
              </label>
              <p className="text-foreground">UTC-5 (Eastern Time)</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Languages className="h-4 w-4" />
                Language Preference
              </label>
              <p className="text-foreground">English (US)</p>
            </div>
          </div>
        </Card>

        {/* Company Card */}
        <Card className="border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Company</h3>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="mb-6" />
          <div className="flex flex-col gap-2 pl-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Name:</span>
              <span>{company.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Seller URL:</span>
              {editing ? (
                <input
                  className="px-2 py-1 border rounded text-sm bg-background text-foreground"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                />
              ) : (
                <span>{company.sellerUrl}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 flex items-center gap-1"
                onClick={() => {
                  if (editing) {
                    setCompany({ ...company, sellerUrl: editUrl });
                  }
                  setEditing(!editing);
                }}
              >
                <Edit className="h-4 w-4" /> {editing ? "Save" : "Edit"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="border-border/50 bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Account Settings</h3>
          <Separator className="mb-6" />
          <div className="space-y-6">
            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4" />
                    Two-Factor Authentication
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="h-4 w-4" />
                    Login Alerts
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Moon className="h-4 w-4" />
                    Dark Mode Preference
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme across the platform
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <Separator />
            {/* Dropdowns */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Dashboard View</label>
                <Select defaultValue="market">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market Dashboard</SelectItem>
                    <SelectItem value="competitors">Competitors</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="trends">Trends</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Frequency</label>
                <Select defaultValue="realtime">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly digest</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download Account Data
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Deactivate Account
              </Button>
            </div>
          </div>
        </Card>

        {/* Subscription & Billing */}
        <Card className="border-border/50 bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Subscription & Billing</h3>
          <Separator className="mb-6" />
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                    Pro Plan
                  </Badge>
                  <span className="text-lg font-semibold">$49/month</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Renewal Date</label>
                <p className="text-foreground">February 15, 2025</p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </label>
                <p className="text-foreground">Visa •••• 4910</p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Billing Email
                </label>
                <p className="text-foreground">billing@example.com</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage Summary</span>
                <span className="font-medium">7,240 / 10,000 tracked products</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] rounded-full bg-purple-500"></div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Subscription
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                Update Payment Method
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Activity */}
        <Card className="border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Security Logs</h3>
            <Button variant="outline" size="sm">
              Sign Out All Sessions
            </Button>
          </div>
          <Separator className="mb-6" />
          <SecurityActivityTable />
        </Card>

        {/* Connected Apps */}
        <Card className="border-border/50 bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Connected Apps</h3>
          <Separator className="mb-6" />
          <ConnectedAppsGrid />
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Last updated · {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
