import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Mail, MessageSquare, Send, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

/**
 * Communication Testing Page
 * 
 * Allows admins to:
 * - Test email and SMS templates with real data
 * - Validate Twilio credentials
 * - Preview template rendering with variable substitution
 * - Track delivery status
 */
export default function CommunicationTesting() {
  const { user } = useAuth();
  const [testType, setTestType] = useState<"email" | "sms">("email");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [testVariables, setTestVariables] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
  });

  // Fetch templates
  const { data: emailTemplates } = trpc.emailTemplates.getAll.useQuery();
  const { data: smsTemplates } = trpc.smsTemplates.getAll.useQuery();

  // Test send mutations
  const sendTestEmail = trpc.emailTemplates.sendTest.useMutation({
    onSuccess: () => {
      alert("Test email sent successfully! Check your inbox.");
    },
    onError: (error: any) => {
      alert(`Failed to send test email: ${error.message}`);
    },
  });

  const sendTestSMS = trpc.smsTemplates.sendTest.useMutation({
    onSuccess: () => {
      alert("Test SMS sent successfully! Check your phone.");
    },
    onError: (error: any) => {
      alert(`Failed to send test SMS: ${error.message}`);
    },
  });

  const validateCredentials = trpc.system.validateTwilioCredentials.useMutation({
    onSuccess: (data: any) => {
      if (data.valid) {
        alert("✅ Twilio credentials are valid!");
      } else {
        alert(`❌ Invalid credentials: ${data.error}`);
      }
    },
    onError: (error: any) => {
      alert(`Failed to validate credentials: ${error.message}`);
    },
  });

  const templates = testType === "email" ? emailTemplates : smsTemplates;
  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);

  const handleSendTest = () => {
    if (!selectedTemplateId) {
      alert("Please select a template");
      return;
    }

    if (!testRecipient) {
      alert("Please enter a recipient");
      return;
    }

    if (testType === "email") {
      sendTestEmail.mutate({
        templateId: selectedTemplateId,
        to: testRecipient,
        variables: testVariables,
      });
    } else {
      sendTestSMS.mutate({
        templateId: selectedTemplateId,
        to: testRecipient,
        variables: testVariables,
      });
    }
  };

  // Render preview with variable substitution
  const renderPreview = (content: string) => {
    let preview = content;
    Object.entries(testVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return preview;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Communication Testing</h1>
          <p className="text-muted-foreground mt-2">
            Test email and SMS templates with real data and validate your Twilio credentials
          </p>
        </div>

        {/* Credential Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Twilio Credentials
            </CardTitle>
            <CardDescription>
              Validate your Twilio Account SID and Auth Token configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => validateCredentials.mutate()}
              disabled={validateCredentials.isPending}
            >
              {validateCredentials.isPending ? "Validating..." : "Validate Credentials"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Configure credentials in Settings → Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
              TWILIO_PHONE_NUMBER
            </p>
          </CardContent>
        </Card>

        {/* Template Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Template Testing</CardTitle>
            <CardDescription>
              Send test messages with variable substitution to verify templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type Selection */}
            <Tabs value={testType} onValueChange={(v) => setTestType(v as "email" | "sms")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select
                value={selectedTemplateId?.toString() || ""}
                onValueChange={(v) => setSelectedTemplateId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label>{testType === "email" ? "Recipient Email" : "Recipient Phone"}</Label>
              <Input
                type={testType === "email" ? "email" : "tel"}
                placeholder={
                  testType === "email" ? "test@example.com" : "+1234567890"
                }
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
            </div>

            {/* Test Variables */}
            <div className="space-y-4">
              <Label>Template Variables</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">First Name</Label>
                  <Input
                    value={testVariables.firstName}
                    onChange={(e) =>
                      setTestVariables({ ...testVariables, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Last Name</Label>
                  <Input
                    value={testVariables.lastName}
                    onChange={(e) =>
                      setTestVariables({ ...testVariables, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <Input
                    value={testVariables.email}
                    onChange={(e) =>
                      setTestVariables({ ...testVariables, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Job Title</Label>
                  <Input
                    value={testVariables.jobTitle}
                    onChange={(e) =>
                      setTestVariables({ ...testVariables, jobTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm">Company Name</Label>
                  <Input
                    value={testVariables.companyName}
                    onChange={(e) =>
                      setTestVariables({ ...testVariables, companyName: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/50">
                  {testType === "email" ? (
                    <div>
                      <div className="font-semibold mb-2">
                        Subject: {renderPreview((selectedTemplate as any).subject || "")}
                      </div>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: renderPreview((selectedTemplate as any).htmlBody || (selectedTemplate as any).body),
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-sm">{renderPreview((selectedTemplate as any).body)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendTest}
              disabled={
                !selectedTemplateId ||
                !testRecipient ||
                sendTestEmail.isPending ||
                sendTestSMS.isPending
              }
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {sendTestEmail.isPending || sendTestSMS.isPending
                ? "Sending..."
                : `Send Test ${testType === "email" ? "Email" : "SMS"}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
