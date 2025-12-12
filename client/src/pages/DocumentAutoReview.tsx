import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  Loader2,
} from "lucide-react";

export default function DocumentAutoReview() {
  const [reviewing, setReviewing] = useState(false);
  
  // Get pending documents
  const { data: pendingDocs, isLoading, refetch } = trpc.documentAutoReview.getPendingReviews.useQuery();
  
  // Batch review mutation
  const batchReviewMutation = trpc.documentAutoReview.batchReview.useMutation({
    onSuccess: (result) => {
      alert(`Batch review complete!\nTotal: ${result.total}\nApproved: ${result.results.filter((r: any) => r.status === "approved").length}\nFlagged: ${result.results.filter((r: any) => r.status === "flagged").length}`);
      refetch();
      setReviewing(false);
    },
    onError: () => {
      alert("Batch review failed");
      setReviewing(false);
    },
  });
  
  const handleBatchReview = () => {
    if (confirm("Start AI auto-review for all pending documents?")) {
      setReviewing(true);
      batchReviewMutation.mutate();
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Smart Document Auto-Review</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered document validation and approval
            </p>
          </div>
          <Button
            onClick={handleBatchReview}
            disabled={!pendingDocs?.length || reviewing}
            size="lg"
          >
            {reviewing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reviewing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Batch Review
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingDocs?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Documents awaiting AI review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Auto-Approved Today</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                High-confidence approvals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Flagged for Manual Review</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requires human verification
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Documents</CardTitle>
            <CardDescription>
              Documents waiting for AI-powered validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
              </div>
            ) : pendingDocs && pendingDocs.length > 0 ? (
              <div className="space-y-3">
                {pendingDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.type} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No documents pending review
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How AI Auto-Review Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced AI parses document content, extracts key information, and validates completeness
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">Confidence Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  Each document receives a confidence score. High-confidence documents (≥80%) are auto-approved
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-between font-bold mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">Smart Routing</h3>
                <p className="text-sm text-muted-foreground">
                  Low-confidence documents are flagged for manual review with detailed AI feedback
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
