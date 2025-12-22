import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Offer Letters Management
 * Generate and track job offers with e-signature support
 */
export default function OfferLetters() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [benefits, setBenefits] = useState<string[]>([
    "Health Insurance",
    "401(k) Matching",
    "Paid Time Off",
  ]);
  const [newBenefit, setNewBenefit] = useState("");
  const [formData, setFormData] = useState({
    candidateId: "",
    jobTitle: "",
    department: "",
    salary: "",
    currency: "USD",
    startDate: "",
    reportingTo: "",
    location: "",
    employmentType: "full-time" as "full-time" | "part-time" | "contract",
    expirationDate: "",
    customTerms: "",
  });

  const { data: offers, refetch } = trpc.offerLetter.getAllOffers.useQuery();
  const generateMutation = trpc.offerLetter.generateOffer.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Calculate expiration date (7 days from now if not set)
      const expirationDate = formData.expirationDate
        ? new Date(formData.expirationDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await generateMutation.mutateAsync({
        candidateId: parseInt(formData.candidateId),
        jobTitle: formData.jobTitle,
        department: formData.department,
        salary: parseInt(formData.salary),
        currency: formData.currency,
        startDate: new Date(formData.startDate),
        benefits,
        reportingTo: formData.reportingTo,
        location: formData.location,
        employmentType: formData.employmentType,
        expirationDate,
        customTerms: formData.customTerms || undefined,
      });

      toast.success(`Offer letter sent! Code: ${result.offerCode}`);
      setIsDialogOpen(false);
      setFormData({
        candidateId: "",
        jobTitle: "",
        department: "",
        salary: "",
        currency: "USD",
        startDate: "",
        reportingTo: "",
        location: "",
        employmentType: "full-time",
        expirationDate: "",
        customTerms: "",
      });
      setBenefits(["Health Insurance", "401(k) Matching", "Paid Time Off"]);
      refetch();
    } catch (error) {
      toast.error("Failed to generate offer letter");
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit("");
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: "outline", icon: FileText },
      sent: { variant: "secondary", icon: Send },
      viewed: { variant: "default", icon: Clock },
      accepted: { variant: "default", icon: CheckCircle },
      declined: { variant: "destructive", icon: XCircle },
      expired: { variant: "outline", icon: Clock },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const stats = {
    total: offers?.length || 0,
    sent: offers?.filter((o) => o.status === "sent").length || 0,
    accepted: offers?.filter((o) => o.status === "accepted").length || 0,
    pending: offers?.filter((o) => ["sent", "viewed"].includes(o.status)).length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Offer Letters</h1>
            <p className="text-muted-foreground mt-1">
              Generate and track job offers with e-signature support
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generate Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Offer Letter</DialogTitle>
                <DialogDescription>
                  Create a professional offer letter with e-signature capability
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="candidateId">Candidate ID *</Label>
                    <Input
                      id="candidateId"
                      type="number"
                      value={formData.candidateId}
                      onChange={(e) =>
                        setFormData({ ...formData, candidateId: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="Senior Software Engineer"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      placeholder="Engineering"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reportingTo">Reporting To *</Label>
                    <Input
                      id="reportingTo"
                      value={formData.reportingTo}
                      onChange={(e) =>
                        setFormData({ ...formData, reportingTo: e.target.value })
                      }
                      placeholder="VP of Engineering"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="salary">Annual Salary *</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="120000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Remote / San Francisco, CA"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employmentType">Employment Type *</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, employmentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationDate">Offer Expiration Date</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expirationDate: e.target.value })
                      }
                      placeholder="Defaults to 7 days"
                    />
                  </div>
                </div>

                <div>
                  <Label>Benefits</Label>
                  <div className="space-y-2 mt-2">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={benefit} disabled />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBenefit(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        placeholder="Add a benefit"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                      />
                      <Button type="button" onClick={addBenefit}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customTerms">Custom Terms (Optional)</Label>
                  <Textarea
                    id="customTerms"
                    value={formData.customTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, customTerms: e.target.value })
                    }
                    placeholder="Any additional terms or conditions..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? "Generating..." : "Generate & Send Offer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? `${Math.round((stats.accepted / stats.total) * 100)}% acceptance rate`
                  : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Needs action</p>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Offer Letters</CardTitle>
            <CardDescription>Track and manage all job offers</CardDescription>
          </CardHeader>
          <CardContent>
            {!offers || offers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p>No offer letters yet</p>
                <p className="text-sm">Generate your first offer to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="font-medium">Candidate #{offer.candidateId}</div>
                        <div className="text-sm text-muted-foreground">
                          {offer.offerCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{offer.jobTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          {offer.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: offer.currency,
                            minimumFractionDigits: 0,
                          }).format(offer.salary)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(offer.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(offer.status)}</TableCell>
                      <TableCell>
                        {offer.sentAt
                          ? new Date(offer.sentAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(offer.expirationDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
