import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Documents page for uploading and managing participant documents
 * Includes drag-and-drop upload functionality
 */
export default function Documents() {
  const { user, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch user's documents
  const { data: documents, isLoading, refetch} = trpc.documents.listByCandidate.useQuery(
    { candidateId: user?.id || 0 },
    { enabled: !!user && !!user.id }
  );

  // Upload mutation
  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF or image files.");
      return;
    }

    // Validate file size (16MB max)
    const maxSize = 16 * 1024 * 1024; // 16MB in bytes
    if (file.size > maxSize) {
      toast.error("File size exceeds 16MB limit");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        await uploadMutation.mutateAsync({
          candidateId: user?.id || 0,
          fileName: file.name,
          fileData: base64,
          mimeType: file.type,
          fileSize: file.size,
          requirementId: undefined, // Optional: can be linked to specific requirement
        });
        
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  }, [uploadMutation]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "approved":
        return { icon: CheckCircle, color: "text-green-600", label: "Approved" };
      case "rejected":
        return { icon: XCircle, color: "text-red-600", label: "Rejected" };
      case "pending":
        return { icon: Clock, color: "text-yellow-600", label: "Pending Review" };
      default:
        return { icon: AlertCircle, color: "text-gray-600", label: "Unknown" };
    }
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
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Documents</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage your required documents for program participation
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Drag and drop a file or click to browse. Accepted formats: PDF, JPG, PNG (Max 16MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {dragActive ? "Drop file here" : "Drag and drop your file here"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {uploading ? "Uploading..." : "Browse Files"}
              </Button>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              View the status of your uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-4">
                {documents.map((doc) => {
                  const statusDisplay = getStatusDisplay(doc.status);
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} />
                        <span className={`text-sm font-medium ${statusDisplay.color}`}>
                          {statusDisplay.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No documents uploaded yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload your first document using the form above
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </PullToRefresh>
    </DashboardLayout>
  );
}
