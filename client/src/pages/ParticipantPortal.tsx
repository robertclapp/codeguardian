import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ParticipantPortal() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | undefined>();

  // Fetch participant data
  const { data: progress, isLoading: progressLoading } = trpc.participantPortal.getMyProgress.useQuery();
  const { data: documents, refetch: refetchDocuments } = trpc.participantPortal.getMyDocuments.useQuery();
  const { data: requiredDocs, refetch: refetchRequired } = trpc.participantPortal.getRequiredDocuments.useQuery();

  // Upload mutation
  const uploadMutation = trpc.participantPortal.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      setSelectedRequirementId(undefined);
      refetchDocuments();
      refetchRequired();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, requirementId?: number) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setSelectedRequirementId(requirementId);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Content = base64.split(",")[1]; // Remove data:image/png;base64, prefix

      uploadMutation.mutate({
        name: selectedFile.name,
        fileContent: base64Content,
        mimeType: selectedFile.type,
        requirementId: selectedRequirementId,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  const currentProgress = progress?.[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="bg-primary text-primary-foreground p-4 md:p-6">
        <div className="container max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold">Welcome, {user?.name}!</h1>
          <p className="text-sm md:text-base opacity-90 mt-1">Track your progress and manage documents</p>
        </div>
      </div>

      <div className="container max-w-4xl py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Progress Overview */}
        {currentProgress && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">{currentProgress.programName}</CardTitle>
                  <CardDescription className="text-sm">
                    Current Stage: {currentProgress.currentStage}
                  </CardDescription>
                </div>
                <Badge className={
                  currentProgress.status === "completed" ? "bg-green-500" :
                  currentProgress.status === "active" ? "bg-blue-500" :
                  "bg-gray-500"
                }>
                  {currentProgress.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{currentProgress.progress}%</span>
                </div>
                <Progress value={currentProgress.progress} className="h-3" />
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium">
                    {new Date(currentProgress.startedAt).toLocaleDateString()}
                  </span>
                </div>
                {currentProgress.completedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium">
                      {new Date(currentProgress.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Stage Progress */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3 text-sm md:text-base">Program Stages</h4>
                <div className="space-y-2">
                  {currentProgress.stages.map((stage: any) => (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        stage.isCurrent ? "bg-primary/5 border-primary" : ""
                      }`}
                    >
                      {stage.isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : stage.isCurrent ? (
                        <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm md:text-base ${stage.isCurrent ? "font-semibold" : ""}`}>
                        {stage.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Required Documents */}
        {requiredDocs && requiredDocs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Required Documents</CardTitle>
              <CardDescription className="text-sm">
                Upload documents to complete your current stage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredDocs.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-semibold text-sm md:text-base">{doc.name}</h4>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground ml-6">{doc.description}</p>
                      )}
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  {!doc.uploaded && (
                    <div className="ml-6 space-y-2">
                      <input
                        type="file"
                        id={`file-${doc.id}`}
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, doc.id)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor={`file-${doc.id}`}>
                        <Button size="sm" variant="outline" className="w-full md:w-auto" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              ))}

              {selectedFile && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">My Documents</CardTitle>
            <CardDescription className="text-sm">
              View all your uploaded documents and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm md:text-base truncate">{doc.name}</span>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="ml-6 text-xs md:text-sm text-muted-foreground space-y-1">
                      <p>Requirement: {doc.requirementName}</p>
                      <p>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                      {doc.fileSize && (
                        <p>Size: {(doc.fileSize / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>If you have questions or need assistance:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Contact your program coordinator</li>
              <li>Email support at support@example.com</li>
              <li>Call (555) 123-4567</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
