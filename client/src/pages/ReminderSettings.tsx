import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ReminderSettings() {
  const [settings, setSettings] = useState({
    enabled: true,
    frequency: "daily" as "daily" | "weekly" | "biweekly",
    missingDocumentsEnabled: true,
    pendingApprovalsEnabled: true,
    stageDeadlinesEnabled: true,
    reminderThresholdDays: 3,
  });

  // Get reminder stats
  const { data: stats } = trpc.reminders.getStats.useQuery();

  // Send all reminders mutation
  const sendAllReminders = trpc.reminders.sendAllReminders.useMutation({
    onSuccess: (data) => {
      toast.success(`Sent ${data.totalSent} reminders successfully`);
      if (data.totalFailed > 0) {
        toast.warning(`${data.totalFailed} reminders failed to send`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  // Send missing document reminders mutation
  const sendMissingDocReminders = trpc.reminders.sendMissingDocumentReminders.useMutation({
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent} missing document reminders`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} reminders failed to send`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  // Send pending approval reminders mutation
  const sendPendingApprovalReminders = trpc.reminders.sendPendingApprovalReminders.useMutation({
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent} pending approval reminders`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} reminders failed to send`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  const handleSendAllReminders = () => {
    sendAllReminders.mutate({ settings });
  };

  const handleSendMissingDocReminders = () => {
    sendMissingDocReminders.mutate({ settings });
  };

  const handleSendPendingApprovalReminders = () => {
    sendPendingApprovalReminders.mutate({ settings });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automated Reminders</h1>
        <p className="text-muted-foreground mt-2">
          Configure and manage automated email reminders for participants and staff
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent (30 days)</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last30Days.totalSent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.last30Days.missingDocumentsSent} documents, {stats.last30Days.pendingApprovalsSent} approvals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lastRun ? new Date(stats.lastRun).toLocaleDateString() : "Never"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.lastRun ? new Date(stats.lastRun).toLocaleTimeString() : "Not yet run"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Reminders</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last30Days.failedReminders}</div>
              <p className="text-xs text-muted-foreground">In the last 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>Configure when and how reminders are sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Automated Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all automated reminder emails
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Threshold Days */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Reminder Threshold (Days)</Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              max="30"
              value={settings.reminderThresholdDays}
              onChange={(e) =>
                setSettings({ ...settings, reminderThresholdDays: parseInt(e.target.value) || 3 })
              }
              disabled={!settings.enabled}
            />
            <p className="text-sm text-muted-foreground">
              Send reminders if documents are missing for this many days
            </p>
          </div>

          {/* Missing Documents */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="missing-docs">Missing Document Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Remind participants to upload missing documents
              </p>
            </div>
            <Switch
              id="missing-docs"
              checked={settings.missingDocumentsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, missingDocumentsEnabled: checked })
              }
              disabled={!settings.enabled}
            />
          </div>

          {/* Pending Approvals */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pending-approvals">Pending Approval Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Remind staff to review pending document approvals
              </p>
            </div>
            <Switch
              id="pending-approvals"
              checked={settings.pendingApprovalsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pendingApprovalsEnabled: checked })
              }
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Triggers</CardTitle>
          <CardDescription>Send reminders immediately for testing or urgent needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleSendAllReminders}
              disabled={sendAllReminders.isPending}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Send All Reminders
            </Button>

            <Button
              onClick={handleSendMissingDocReminders}
              disabled={sendMissingDocReminders.isPending}
              variant="outline"
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Missing Documents
            </Button>

            <Button
              onClick={handleSendPendingApprovalReminders}
              disabled={sendPendingApprovalReminders.isPending}
              variant="outline"
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Pending Approvals
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Automated Schedule</h4>
            <p className="text-sm text-muted-foreground">
              To enable automated daily reminders, set up a cron job on your server:
            </p>
            <code className="block mt-2 p-2 bg-background rounded text-xs">
              0 9 * * * cd /path/to/project && tsx server/cron/sendDailyReminders.ts
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              This will run daily at 9:00 AM server time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
