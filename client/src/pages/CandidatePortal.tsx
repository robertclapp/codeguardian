import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function CandidatePortal() {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  // Get token from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  // Request access mutation
  const requestAccessMutation = trpc.candidatePortal.requestAccess.useMutation({
    onSuccess: (data) => {
      setRequestSent(true);
      // In dev, auto-set the token
      if (data.devToken) {
        setToken(data.devToken);
      }
    },
  });

  // Validate token and get candidate info
  const { data: candidateInfo, isLoading } = trpc.candidatePortal.validateToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // Update contact mutation
  const updateContactMutation = trpc.candidatePortal.updateContact.useMutation({
    onSuccess: () => {
      alert("Contact information updated successfully!");
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = trpc.candidatePortal.uploadDocument.useMutation({
    onSuccess: () => {
      alert("Document uploaded successfully!");
      window.location.reload();
    },
  });

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    requestAccessMutation.mutate({ email });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file || !candidateInfo) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocumentMutation.mutate({
        candidateId: candidateInfo.candidate.id,
        documentType: documentType as any,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Pending Review" },
      approved: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
      rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Access request form
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Candidate Portal Access</CardTitle>
            <CardDescription>
              Enter your email address to receive an access link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestSent ? (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Access Link Sent!</p>
                <p className="text-sm text-muted-foreground">
                  Check your email for the access link. It will expire in 7 days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestAccessMutation.isPending}
                >
                  {requestAccessMutation.isPending ? "Sending..." : "Request Access"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!candidateInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Access Link</CardTitle>
            <CardDescription>
              This access link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setToken("")} className="w-full">
              Request New Access Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { candidate, job, documents, progress } = candidateInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Welcome, {candidate.name}!
            </CardTitle>
            <CardDescription>
              Track your application status and manage your documents
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job && (
                <div>
                  <Label className="text-sm text-muted-foreground">Applied For</Label>
                  <p className="font-medium">{job.title}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-muted-foreground">Current Stage</Label>
                <div className="mt-1">{getStatusBadge((candidate as any).stage || "pending")}</div>
              </div>
              {progress && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Program Progress
                  </Label>
                  <Progress value={(progress as any).completionPercentage || 0} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {(progress as any).completionPercentage || 0}% Complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {(candidate as any).address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{(candidate as any).address}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  const phone = prompt("Enter new phone number:", candidate.phone || "");
                  if (phone) {
                    updateContactMutation.mutate({
                      candidateId: candidate.id,
                      phone,
                    });
                  }
                }}
              >
                Update Contact Info
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Upload and track your application documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Document list */}
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              )}

              {/* Upload buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t">
                {["resume", "cover_letter", "id", "certification"].map((type) => (
                  <div key={type}>
                    <Input
                      type="file"
                      id={`upload-${type}`}
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, type)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById(`upload-${type}`)?.click()}
                      disabled={uploadDocumentMutation.isPending}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {type.replace("_", " ")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
