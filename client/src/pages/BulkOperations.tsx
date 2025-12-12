import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Mail,
  MessageSquare,
  CheckCircle,
  Download,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function BulkOperations() {
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [newStage, setNewStage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [operationResult, setOperationResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Fetch candidates
  const { data: candidates } = trpc.candidates.list.useQuery();

  // Bulk operations mutations
  const bulkUpdateStatusMutation = trpc.bulkOperations.bulkUpdateCandidateStatus.useMutation({
    onSuccess: (result) => {
      setOperationResult(result);
      setSelectedCandidates([]);
    },
  });

  const bulkSendEmailsMutation = trpc.bulkOperations.bulkSendEmails.useMutation({
    onSuccess: (result) => {
      setOperationResult(result);
      setEmailSubject("");
      setEmailContent("");
    },
  });

  const bulkSendSMSMutation = trpc.bulkOperations.bulkSendSMS.useMutation({
    onSuccess: (result) => {
      setOperationResult(result);
      setSmsMessage("");
    },
  });

  const handleToggleCandidate = (candidateId: number) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates?.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates?.map((c) => c.id) || []);
    }
  };

  const handleBulkUpdateStatus = () => {
    if (selectedCandidates.length === 0 || !newStage) {
      alert("Please select candidates and a new status");
      return;
    }

    bulkUpdateStatusMutation.mutate({
      candidateIds: selectedCandidates,
      newStage,
      sendNotification: true,
    });
  };

  const handleBulkSendEmails = () => {
    if (selectedCandidates.length === 0 || !emailSubject || !emailContent) {
      alert("Please select candidates and provide email content");
      return;
    }

    bulkSendEmailsMutation.mutate({
      recipientType: "candidates",
      candidateIds: selectedCandidates,
      subject: emailSubject,
      htmlContent: emailContent,
    });
  };

  const handleBulkSendSMS = () => {
    if (selectedCandidates.length === 0 || !smsMessage) {
      alert("Please select candidates and provide SMS message");
      return;
    }

    bulkSendSMSMutation.mutate({
      candidateIds: selectedCandidates,
      message: smsMessage,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Operations</h1>
        <p className="text-muted-foreground mt-2">
          Perform batch actions on multiple candidates at once
        </p>
      </div>

      {/* Operation Result */}
      {operationResult && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Operation Complete</span>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {operationResult.success} Success
                  </Badge>
                  {operationResult.failed > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {operationResult.failed} Failed
                    </Badge>
                  )}
                </div>
              </div>
              {operationResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Errors:</p>
                  <ul className="text-sm space-y-1">
                    {operationResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i} className="text-red-700">
                        • {error}
                      </li>
                    ))}
                    {operationResult.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        ... and {operationResult.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOperationResult(null)}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Candidate Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Candidates
            </CardTitle>
            <CardDescription>Choose candidates for bulk operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedCandidates.length === candidates?.length && candidates.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({selectedCandidates.length} selected)
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {candidates?.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded"
                  >
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.id)}
                      onCheckedChange={() => handleToggleCandidate(candidate.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Perform actions on {selectedCandidates.length} selected candidate(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="status">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">Update Status</TabsTrigger>
                <TabsTrigger value="email">Send Emails</TabsTrigger>
                <TabsTrigger value="sms">Send SMS</TabsTrigger>
              </TabsList>

              {/* Update Status Tab */}
              <TabsContent value="status" className="space-y-4">
                <div>
                  <Label htmlFor="newStage">New Status</Label>
                  <Select value={newStage} onValueChange={setNewStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Email notifications will be sent to all selected candidates about their status
                      change.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleBulkUpdateStatus}
                  disabled={
                    selectedCandidates.length === 0 ||
                    !newStage ||
                    bulkUpdateStatusMutation.isPending
                  }
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {bulkUpdateStatusMutation.isPending
                    ? "Updating..."
                    : `Update ${selectedCandidates.length} Candidate(s)`}
                </Button>
              </TabsContent>

              {/* Send Emails Tab */}
              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label htmlFor="emailSubject">Email Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>

                <div>
                  <Label htmlFor="emailContent">Email Content (HTML)</Label>
                  <Textarea
                    id="emailContent"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="<p>Enter your email content here...</p>"
                    rows={8}
                  />
                </div>

                <Button
                  onClick={handleBulkSendEmails}
                  disabled={
                    selectedCandidates.length === 0 ||
                    !emailSubject ||
                    !emailContent ||
                    bulkSendEmailsMutation.isPending
                  }
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {bulkSendEmailsMutation.isPending
                    ? "Sending..."
                    : `Send to ${selectedCandidates.length} Candidate(s)`}
                </Button>
              </TabsContent>

              {/* Send SMS Tab */}
              <TabsContent value="sms" className="space-y-4">
                <div>
                  <Label htmlFor="smsMessage">SMS Message</Label>
                  <Textarea
                    id="smsMessage"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Enter your SMS message..."
                    rows={4}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {smsMessage.length}/160 characters
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-900">
                      SMS will only be sent to candidates who have a valid phone number on file.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleBulkSendSMS}
                  disabled={
                    selectedCandidates.length === 0 ||
                    !smsMessage ||
                    bulkSendSMSMutation.isPending
                  }
                  className="w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {bulkSendSMSMutation.isPending
                    ? "Sending..."
                    : `Send to ${selectedCandidates.length} Candidate(s)`}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
