import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, FileText, Eye, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Document Approval interface for staff to review and approve/reject documents
 */
export default function DocumentApproval() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch pending documents
  const { data: pendingDocs, isLoading, refetch } = trpc.documents.getPending.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Approve mutation
  const approveMutation = trpc.documents.approve.useMutation({
    onSuccess: () => {
      toast.success("Document approved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve document");
    },
  });

  // Reject mutation
  const rejectMutation = trpc.documents.reject.useMutation({
    onSuccess: () => {
      toast.success("Document rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedDoc(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject document");
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = trpc.documents.bulkApprove.useMutation({
    onSuccess: (result) => {
      const approvedCount = result.results.filter((r: any) => r.success).length;
      toast.success(`${approvedCount} documents approved successfully`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to bulk approve documents");
    },
  });

  const handleApprove = (documentId: number) => {
    approveMutation.mutate({ documentId });
  };

  const handleReject = () => {
    if (!selectedDoc) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      documentId: selectedDoc,
      reason: rejectionReason,
    });
  };

  const handleBulkApprove = () => {
    if (!pendingDocs || pendingDocs.length === 0) {
      toast.error("No pending documents to approve");
      return;
    }
    const documentIds = pendingDocs.map((doc) => doc.id);
    bulkApproveMutation.mutate({ documentIds });
  };

  const openRejectDialog = (documentId: number) => {
    setSelectedDoc(documentId);
    setShowRejectDialog(true);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Approval</h1>
            <p className="text-muted-foreground mt-2">
              Review and approve participant documents
            </p>
          </div>
          {pendingDocs && pendingDocs.length > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
            >
              {bulkApproveMutation.isPending ? "Approving..." : "Approve All"}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Documents ({pendingDocs?.length || 0})
            </CardTitle>
            <CardDescription>
              Documents waiting for review and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pendingDocs && pendingDocs.length > 0 ? (
              <div className="space-y-4">
                {pendingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Candidate: {doc.candidateName} ({doc.candidateEmail})
                        </p>
                        {doc.requirementId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Requirement ID: {doc.requirementId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(doc.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openRejectDialog(doc.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-medium mb-2">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  There are no pending documents to review
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Document</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this document. This will be sent to the participant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Document is unclear, missing required information, expired..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                  setSelectedDoc(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
