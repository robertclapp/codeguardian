import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";

export function WebhookSettings() {
  const [slackUrl, setSlackUrl] = useState("");
  const [teamsUrl, setTeamsUrl] = useState("");
  
  const testSlack = trpc.system.testSlackWebhook.useMutation();
  const testTeams = trpc.system.testTeamsWebhook.useMutation();

  const handleTestSlack = async () => {
    if (!slackUrl) {
      alert("Please enter Slack webhook URL");
      return;
    }
    const result = await testSlack.mutateAsync({ webhookUrl: slackUrl });
    alert(result.success ? "✅ Slack webhook test successful!" : "❌ Slack webhook test failed");
  };

  const handleTestTeams = async () => {
    if (!teamsUrl) {
      alert("Please enter Teams webhook URL");
      return;
    }
    const result = await testTeams.mutateAsync({ webhookUrl: teamsUrl });
    alert(result.success ? "✅ Teams webhook test successful!" : "❌ Teams webhook test failed");
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Webhook Configuration</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Slack Integration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure Slack webhook to receive real-time notifications for new applications, document approvals, and interview scheduling.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Slack Webhook URL</label>
              <Input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleTestSlack} disabled={testSlack.isPending}>
              {testSlack.isPending ? "Testing..." : "Test Slack Webhook"}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Microsoft Teams Integration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure Teams webhook to receive real-time notifications for new applications, document approvals, and interview scheduling.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Teams Webhook URL</label>
              <Input
                type="url"
                placeholder="https://outlook.office.com/webhook/..."
                value={teamsUrl}
                onChange={(e) => setTeamsUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleTestTeams} disabled={testTeams.isPending}>
              {testTeams.isPending ? "Testing..." : "Test Teams Webhook"}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Notification Events</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The following events will trigger webhook notifications:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>New candidate application received</li>
            <li>Document approved or flagged for review</li>
            <li>Interview scheduled or rescheduled</li>
            <li>Candidate status changed</li>
            <li>Background check completed</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
