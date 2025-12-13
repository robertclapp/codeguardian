import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  UserPlus,
  Link as LinkIcon,
  Copy,
  TrendingUp,
  DollarSign,
  Users,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Referrals - Employee referral program
 */
export default function Referrals() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    jobId: "",
    notes: "",
  });

  const { data: referrals, refetch } = trpc.referrals.list.useQuery();
  const { data: stats } = trpc.referrals.getStats.useQuery();
  const { data: leaderboard } = trpc.referrals.getLeaderboard.useQuery();
  const createMutation = trpc.referrals.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createMutation.mutateAsync({
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        candidatePhone: formData.candidatePhone || undefined,
        jobId: formData.jobId ? parseInt(formData.jobId) : undefined,
        notes: formData.notes || undefined,
      });

      toast.success(`Referral created! Code: ${result.referralCode}`);
      setIsDialogOpen(false);
      setFormData({
        candidateName: "",
        candidateEmail: "",
        candidatePhone: "",
        jobId: "",
        notes: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to create referral");
    }
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/apply?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hired":
        return "default";
      case "offer":
        return "default";
      case "interview":
        return "secondary";
      case "screening":
        return "secondary";
      case "applied":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Referral Program</h1>
            <p className="text-muted-foreground mt-1">
              Refer qualified candidates and earn bonuses when they're hired
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                New Referral
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit a Referral</DialogTitle>
                <DialogDescription>
                  Refer a qualified candidate for an open position
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="candidateName">Candidate Name *</Label>
                  <Input
                    id="candidateName"
                    value={formData.candidateName}
                    onChange={(e) =>
                      setFormData({ ...formData, candidateName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="candidateEmail">Candidate Email *</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={formData.candidateEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, candidateEmail: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="candidatePhone">Candidate Phone</Label>
                  <Input
                    id="candidatePhone"
                    type="tel"
                    value={formData.candidatePhone}
                    onChange={(e) =>
                      setFormData({ ...formData, candidatePhone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="jobId">Job ID (Optional)</Label>
                  <Input
                    id="jobId"
                    type="number"
                    value={formData.jobId}
                    onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Why is this candidate a good fit?"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit Referral"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hired</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.hired || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total ? Math.round(((stats.hired || 0) / stats.total) * 100) : 0}%
                conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats?.totalBonusEarned || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Paid bonuses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bonus</CardTitle>
              <Award className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats?.pendingBonus || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referrals List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>Track the status of your candidate referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {!referrals || referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Start referring candidates to earn bonuses!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{referral.candidateName}</div>
                            <div className="text-sm text-muted-foreground">
                              {referral.candidateEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {referral.referralCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(referral.status)}>
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {referral.bonusPaid ? (
                            <span className="text-green-600 font-medium">
                              ${referral.bonusPaid.toLocaleString()} ✓
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              ${(referral.bonusAmount || 0).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyReferralLink(referral.referralCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Leaderboard
              </CardTitle>
              <CardDescription>Top referrers this month</CardDescription>
            </CardHeader>
            <CardContent>
              {!leaderboard || leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.referrerId} className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                            ? "bg-orange-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">User #{entry.referrerId}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.hiredCount} hired · {entry.totalReferrals} total
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ${entry.totalEarned.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How the Referral Program Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">1. Submit Referral</h3>
                <p className="text-sm text-muted-foreground">
                  Provide candidate details and get a unique referral code
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-between">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">2. Share Link</h3>
                <p className="text-sm text-muted-foreground">
                  Send the referral link to your candidate
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">3. Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your referral through the hiring pipeline
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">4. Earn Bonus</h3>
                <p className="text-sm text-muted-foreground">
                  Receive $1,000 when your referral is hired
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
