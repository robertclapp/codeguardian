import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, CheckCircle2, XCircle, AlertCircle, Phone } from "lucide-react";
import { toast } from "sonner";

export default function SMSSettings() {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("This is a test message from your HR Platform!");

  // Get SMS configuration
  const { data: config, isLoading } = trpc.sms.getConfig.useQuery();
  const { data: templates } = trpc.sms.getTemplates.useQuery();

  // Send test SMS mutation
  const sendTestMutation = trpc.sms.sendTest.useMutation({
    onSuccess: () => {
      toast.success("Test SMS sent successfully!");
      setTestPhone("");
    },
    onError: (error) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });

  // Validate phone
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; formatted: string | null } | null>(null);

  const handleSendTest = () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    sendTestMutation.mutate({
      to: testPhone,
      message: testMessage,
    });
  };

  const utils = trpc.useUtils();

  const handleValidatePhone = async () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    try {
      const result = await utils.sms.validatePhone.fetch({ phone: testPhone });
      setValidationResult(result);
      if (result.isValid) {
        toast.success(`Valid phone number: ${result.formatted}`);
      } else {
        toast.error("Invalid phone number format");
      }
    } catch (error: any) {
      toast.error(`Validation failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SMS settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SMS Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Configure Twilio SMS notifications for participants and staff
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
          <CardDescription>Current Twilio integration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config?.configured ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <p className="font-medium">Twilio Configuration</p>
                <p className="text-sm text-muted-foreground">
                  {config?.configured ? "All credentials configured" : "Missing credentials"}
                </p>
              </div>
            </div>
            <Badge variant={config?.configured ? "default" : "destructive"}>
              {config?.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config?.enabled ? "bg-green-500" : "bg-yellow-500"}`} />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {config?.enabled ? "Enabled and active" : "Disabled"}
                </p>
              </div>
            </div>
            <Badge variant={config?.enabled ? "default" : "secondary"}>
              {config?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {config?.fromNumber && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">From Number</p>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{config.fromNumber}</p>
            </div>
          )}

          {!config?.configured && config?.missingCredentials && config.missingCredentials.length > 0 && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Missing Environment Variables
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                    Please set the following environment variables in Settings → Secrets:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {config.missingCredentials.filter((cred): cred is string => typeof cred === "string").map((cred) => (
                      <li key={cred}>{cred}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle>Test SMS</CardTitle>
          <CardDescription>Send a test message to verify your Twilio configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="test-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!config?.configured}
              />
              <Button
                onClick={handleValidatePhone}
                variant="outline"
                disabled={!config?.configured}
              >
                Validate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter phone number with country code (e.g., +1 for US)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-message">Message</Label>
            <Textarea
              id="test-message"
              placeholder="Enter your test message..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={!config?.configured}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              SMS messages are limited to 160 characters
            </p>
          </div>

          <Button
            onClick={handleSendTest}
            disabled={!config?.configured || !testPhone || !testMessage || sendTestMutation.isPending}
            className="w-full md:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendTestMutation.isPending ? "Sending..." : "Send Test SMS"}
          </Button>
        </CardContent>
      </Card>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Templates</CardTitle>
          <CardDescription>Pre-configured message templates for notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template: any) => (
                <div key={template.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{template.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No templates available</p>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Create a Twilio Account</h4>
            <p className="text-sm text-muted-foreground">
              Sign up for a free Twilio account at{" "}
              <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                twilio.com/try-twilio
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Get Your Credentials</h4>
            <p className="text-sm text-muted-foreground mb-2">
              From your Twilio Console, copy the following:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Account SID</li>
              <li>Auth Token</li>
              <li>Phone Number (from Phone Numbers section)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Add Environment Variables</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Go to Settings → Secrets and add:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li><code className="bg-background px-1 py-0.5 rounded">TWILIO_ACCOUNT_SID</code></li>
              <li><code className="bg-background px-1 py-0.5 rounded">TWILIO_AUTH_TOKEN</code></li>
              <li><code className="bg-background px-1 py-0.5 rounded">TWILIO_PHONE_NUMBER</code></li>
              <li><code className="bg-background px-1 py-0.5 rounded">SMS_NOTIFICATIONS_ENABLED=true</code></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">4. Test Your Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Use the test form above to send a test message and verify everything works
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Trial Account Limits
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Twilio trial accounts can only send SMS to verified phone numbers. To send to any number, upgrade to a paid account.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
