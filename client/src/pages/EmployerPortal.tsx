import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  CheckCircle,
} from "lucide-react";

export default function EmployerPortal() {
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  
  // Get employer stats
  const { data: stats } = trpc.employerPortal.getStats.useQuery();
  
  // Get employer's jobs
  const { data: jobs, refetch: refetchJobs } = trpc.employerPortal.getMyJobs.useQuery();
  
  // Get matched candidates for selected job
  const { data: candidates } = trpc.employerPortal.getMatchedCandidates.useQuery(
    { jobId: selectedJob! },
    { enabled: !!selectedJob }
  );
  
  // Create job mutation
  const createJobMutation = trpc.employerPortal.createJob.useMutation({
    onSuccess: () => {
      alert("Job posted successfully!");
      setCreateJobOpen(false);
      refetchJobs();
    },
  });
  
  const handleCreateJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createJobMutation.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      requirements: formData.get("requirements") as string,
      location: formData.get("location") as string,
      type: formData.get("type") as any,
      salaryMin: formData.get("salaryMin") ? parseInt(formData.get("salaryMin") as string) : undefined,
      salaryMax: formData.get("salaryMax") ? parseInt(formData.get("salaryMax") as string) : undefined,
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employer Portal</h1>
            <p className="text-muted-foreground mt-1">
              Post jobs and find qualified candidates
            </p>
          </div>
          <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Post New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a New Job</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a job posting
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" name="title" required placeholder="e.g., Software Engineer" />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    placeholder="Describe the role, responsibilities, and company..."
                  />
                </div>
                <div>
                  <Label htmlFor="requirements">Requirements *</Label>
                  <Textarea
                    id="requirements"
                    name="requirements"
                    required
                    rows={3}
                    placeholder="List required skills, experience, education..."
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input id="location" name="location" required placeholder="e.g., San Francisco, CA" />
                  </div>
                  <div>
                    <Label htmlFor="type">Job Type *</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Minimum Salary</Label>
                    <Input
                      id="salaryMin"
                      name="salaryMin"
                      type="number"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Maximum Salary</Label>
                    <Input
                      id="salaryMax"
                      name="salaryMax"
                      type="number"
                      placeholder="80000"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateJobOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createJobMutation.isPending}>
                    {createJobMutation.isPending ? "Posting..." : "Post Job"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCandidates || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Applications</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.newApplications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Successful Placements</CardTitle>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.placements || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Job Postings</CardTitle>
            <CardDescription>Manage your active and past job listings</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs && jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{job.title}</h3>
                        <Badge variant={job.status === "open" ? "default" : "secondary"}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {job.location} • {job.type.replace("_", " ")} • Posted {new Date(job.postedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJob(job.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Candidates
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">No job postings yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first job posting to start finding candidates
                </p>
                <Button onClick={() => setCreateJobOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matched Candidates */}
        {selectedJob && candidates && (
          <Card>
            <CardHeader>
              <CardTitle>Matched Candidates</CardTitle>
              <CardDescription>
                AI-matched candidates for your job posting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {candidates.map((candidate: any) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">Match Score</p>
                        <p className="text-2xl font-bold text-green-600">{candidate.matchScore}%</p>
                      </div>
                      <Button size="sm">Request Interview</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
