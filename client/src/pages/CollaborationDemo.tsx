import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PresenceIndicator } from "@/components/PresenceIndicator";
// import { usePresence } from "@/hooks/usePresence";
import { Users, Zap } from "lucide-react";

/**
 * Real-time Collaboration Demo
 * Demonstrates presence indicators and live updates
 */
export default function CollaborationDemo() {
  const [candidateName, setCandidateName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [status, setStatus] = useState("screening");
  const [notes, setNotes] = useState("");

  // Use presence hook for this demo resource
  // const { presentUsers, isConnected, broadcastFieldUpdate, broadcastStatusChange } =
  //   usePresence("candidate", "demo-123");
  const presentUsers: any[] = [];
  const isConnected = false;
  const broadcastFieldUpdate = () => {};
  const broadcastStatusChange = () => {};

  const handleNameChange = (value: string) => {
    setCandidateName(value);
    broadcastFieldUpdate("name", value);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    broadcastFieldUpdate("email", value);
  };

  const handleStatusChange = (value: string) => {
    const oldStatus = status;
    setStatus(value);
    broadcastStatusChange(oldStatus, value);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    broadcastFieldUpdate("notes", value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Presence */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Real-time Collaboration Demo</h1>
            <p className="text-muted-foreground mt-1">
              Open this page in multiple browser tabs to see live presence indicators
            </p>
          </div>
          <PresenceIndicator presentUsers={presentUsers} isConnected={isConnected} />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Viewers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{presentUsers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {presentUsers.length === 0
                  ? "No other users viewing"
                  : presentUsers.map((u) => u.userName).join(", ")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isConnected ? "Connected" : "Disconnected"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected
                  ? "Real-time updates enabled"
                  : "Reconnecting..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Form */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
            <CardDescription>
              Edit these fields and see updates broadcast to other viewers in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Candidate Name</Label>
              <Input
                id="name"
                value={candidateName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter candidate name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about the candidate"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open this page in multiple browser tabs or windows</li>
              <li>
                Watch the "Active Viewers" count increase as you open more tabs
              </li>
              <li>
                See user avatars appear in the presence indicator at the top right
              </li>
              <li>
                Edit any field in one tab and observe that other tabs receive
                the updates in real-time
              </li>
              <li>
                Close a tab and watch the presence indicator update to remove
                that user
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
