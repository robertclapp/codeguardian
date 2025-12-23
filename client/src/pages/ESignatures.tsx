import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { 
  FileSignature, Plus, Send, Clock, CheckCircle, XCircle, 
  RefreshCw, Download, Eye, Bell, Trash2, MoreVertical,
  FileText, User, Calendar, DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

/**
 * E-Signatures Management Page (SignSmart Integration)
 * Manage offer letter signatures with tracking and reminders
 */
export default function ESignatures() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Form state for new signature request
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [benefits, setBenefits] = useState("Health insurance, 401(k) matching, PTO, professional development budget");

  // Mock data for signature requests
  const [signatureRequests] = useState([
    {
      id: "sig_001",
      candidateName: "Sarah Johnson",
      candidateEmail: "sarah.johnson@email.com",
      jobTitle: "Senior Software Engineer",
      status: "completed",
      createdAt: new Date("2024-01-15"),
      completedAt: new Date("2024-01-16"),
      signers: [
        { name: "Sarah Johnson", email: "sarah.johnson@email.com", status: "signed", signedAt: new Date("2024-01-16") },
        { name: "HR Manager", email: "hr@company.com", status: "signed", signedAt: new Date("2024-01-15") },
      ],
    },
    {
      id: "sig_002",
      candidateName: "Michael Chen",
      candidateEmail: "m.chen@email.com",
      jobTitle: "Product Manager",
      status: "pending",
      createdAt: new Date("2024-01-18"),
      signers: [
        { name: "Michael Chen", email: "m.chen@email.com", status: "pending" },
        { name: "HR Manager", email: "hr@company.com", status: "signed", signedAt: new Date("2024-01-18") },
      ],
    },
    {
      id: "sig_003",
      candidateName: "Emily Rodriguez",
      candidateEmail: "emily.r@email.com",
      jobTitle: "UX Designer",
      status: "expired",
      createdAt: new Date("2024-01-01"),
      expiresAt: new Date("2024-01-08"),
      signers: [
        { name: "Emily Rodriguez", email: "emily.r@email.com", status: "pending" },
        { name: "HR Manager", email: "hr@company.com", status: "signed", signedAt: new Date("2024-01-01") },
      ],
    },
  ]);

  const stats = {
    total: signatureRequests.length,
    pending: signatureRequests.filter(r => r.status === "pending").length,
    completed: signatureRequests.filter(r => r.status === "completed").length,
    expired: signatureRequests.filter(r => r.status === "expired").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case "declined":
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateRequest = () => {
    if (!candidateName || !candidateEmail || !jobTitle || !salary || !startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // In production, this would call the SignSmart API
    toast.success("Signature request created and sent to candidate!");
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCandidateName("");
    setCandidateEmail("");
    setJobTitle("");
    setDepartment("");
    setSalary("");
    setStartDate("");
    setBenefits("Health insurance, 401(k) matching, PTO, professional development budget");
  };

  const handleSendReminder = (requestId: string) => {
    toast.success("Reminder sent to pending signers");
  };

  const handleDownload = (requestId: string) => {
    toast.info("Downloading signed document...");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">E-Signatures</h1>
            <p className="text-muted-foreground">
              Manage offer letter signatures with SignSmart integration
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Signature Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileSignature className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signature Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Signature Requests</CardTitle>
            <CardDescription>Track and manage offer letter signatures</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Signers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatureRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.candidateName}</p>
                        <p className="text-sm text-muted-foreground">{request.candidateEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{request.jobTitle}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{request.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {request.signers.map((signer, i) => (
                          <div
                            key={i}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white ${
                              signer.status === "signed" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-600"
                            }`}
                            title={`${signer.name}: ${signer.status}`}
                          >
                            {signer.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleSendReminder(request.id)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Send Reminder
                            </DropdownMenuItem>
                          )}
                          {request.status === "completed" && (
                            <DropdownMenuItem onClick={() => handleDownload(request.id)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download Signed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Signature Request Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Signature Request</DialogTitle>
              <DialogDescription>
                Generate an offer letter and send it for e-signature via SignSmart
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="candidateName">Candidate Name *</Label>
                  <Input
                    id="candidateName"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="candidateEmail">Candidate Email *</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary">Annual Salary *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salary"
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="75000"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="benefits">Benefits Package</Label>
                <Textarea
                  id="benefits"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="List benefits included in the offer..."
                  rows={3}
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Preview
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    An offer letter will be generated with the above details and sent to {candidateEmail || "the candidate"} for signature.
                    The document will include:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Position details and compensation</li>
                    <li>• Benefits package summary</li>
                    <li>• Start date and contingencies</li>
                    <li>• Signature fields for both parties</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest}>
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Signature Request Details</DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedRequest.candidateName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedRequest.candidateEmail}</p>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedRequest.jobTitle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{selectedRequest.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Signers</h4>
                  <div className="space-y-2">
                    {selectedRequest.signers.map((signer: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            signer.status === "signed" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {signer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{signer.name}</p>
                            <p className="text-xs text-muted-foreground">{signer.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {signer.status === "signed" ? (
                            <div>
                              <Badge variant="outline" className="text-green-600">Signed</Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {signer.signedAt?.toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedRequest.status === "pending" && (
                    <Button variant="outline" className="flex-1" onClick={() => handleSendReminder(selectedRequest.id)}>
                      <Bell className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                  )}
                  {selectedRequest.status === "completed" && (
                    <Button variant="outline" className="flex-1" onClick={() => handleDownload(selectedRequest.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
