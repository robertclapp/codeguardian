import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function SMSNotifications() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get Twilio status
  const { data: twilioStatus, isLoading: statusLoading } =
    trpc.smsNotifications.getStatus.useQuery();

  // Send SMS mutation
  const sendSMSMutation = trpc.smsNotifications.send.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setSendResult({
          success: true,
          message: `SMS sent successfully! Message ID: ${result.messageId}`,
        });
        setPhoneNumber("");
        setMessage("");
      } else {
        setSendResult({
          success: false,
          message: result.error || "Failed to send SMS",
        });
      }
    },
    onError: (error) => {
      setSendResult({
        success: false,
        message: error.message,
      });
    },
  });

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    setSendResult(null);
    sendSMSMutation.mutate({
      to: phoneNumber,
      message,
    });
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SMS configuration...</p>
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
          Send time-sensitive alerts via SMS to candidates and staff
        </p>
      </div>

      {/* Twilio Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Twilio Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={twilioStatus?.configured ? "default" : "secondary"}>
              {twilioStatus?.configured ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account SID</span>
            <span className="text-sm text-muted-foreground">{twilioStatus?.accountSid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Phone Number</span>
            <span className="text-sm text-muted-foreground">{twilioStatus?.phoneNumber}</span>
          </div>

          {!twilioStatus?.configured && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">Twilio Not Configured</p>
                  <p className="text-yellow-700 mt-1">
                    To enable SMS notifications, please configure the following environment
                    variables:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-yellow-700 space-y-1">
                    <li>TWILIO_ACCOUNT_SID</li>
                    <li>TWILIO_AUTH_TOKEN</li>
                    <li>TWILIO_PHONE_NUMBER</li>
                  </ul>
                  <p className="mt-2 text-yellow-700">
                    You can add these in Settings → Secrets in the management UI.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test SMS</CardTitle>
          <CardDescription>
            Test your SMS configuration by sending a message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendSMS} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
                disabled={!twilioStatus?.configured}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use E.164 format (e.g., +1234567890)
              </p>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your SMS message..."
                rows={4}
                required
                disabled={!twilioStatus?.configured}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/160 characters
              </p>
            </div>

            {sendResult && (
              <div
                className={`p-4 rounded-lg border ${
                  sendResult.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {sendResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      sendResult.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {sendResult.message}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!twilioStatus?.configured || sendSMSMutation.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendSMSMutation.isPending ? "Sending..." : "Send Test SMS"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Automated SMS Templates</CardTitle>
          <CardDescription>
            SMS notifications are automatically sent for these events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm mb-1">Interview Reminder</h4>
              <p className="text-xs text-muted-foreground">
                Sent 24 hours before scheduled interviews
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm mb-1">Document Approval</h4>
              <p className="text-xs text-muted-foreground">
                Sent when candidate documents are approved
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm mb-1">Status Change</h4>
              <p className="text-xs text-muted-foreground">
                Sent when candidate application status changes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
