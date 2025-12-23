import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Globe, Eye, Send, Settings, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function PublicJobBoard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: stats } = trpc.jobBoard.getStats.useQuery();
  const { data: settings } = trpc.jobBoard.getSettings.useQuery();
  const { data: jobs } = trpc.jobs.list.useQuery();
  const { data: applications } = trpc.jobBoard.listApplications.useQuery();

  const publishMutation = trpc.jobBoard.publishJob.useMutation({
    onSuccess: () => {
      toast.success("Job published successfully");
      setIsPublishOpen(false);
    },
  });

  const updateSettingsMutation = trpc.jobBoard.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      setIsSettingsOpen(false);
    },
  });

  const handlePublishJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJobId) return;

    const formData = new FormData(e.currentTarget);
    publishMutation.mutate({
      jobId: selectedJobId,
      slug: formData.get("slug") as string,
      metaTitle: formData.get("metaTitle") as string,
      metaDescription: formData.get("metaDescription") as string,
      expiresAt: formData.get("expiresAt") as string,
    });
  };

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettingsMutation.mutate({
      companyName: formData.get("companyName") as string,
      companyDescription: formData.get("companyDescription") as string,
      primaryColor: formData.get("primaryColor") as string,
      enableApplications: formData.get("enableApplications") === "on" ? 1 : 0,
      requireResume: formData.get("requireResume") === "on" ? 1 : 0,
      requireCoverLetter: formData.get("requireCoverLetter") === "on" ? 1 : 0,
    });
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Public Job Board</h1>
          <p className="text-muted-foreground">SEO-optimized career site for candidates</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Job Board Settings</DialogTitle>
                <DialogDescription>Configure your public career site</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={settings?.companyName}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    name="companyDescription"
                    defaultValue={settings?.companyDescription || ""}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    defaultValue={settings?.primaryColor}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableApplications"
                      name="enableApplications"
                      defaultChecked={settings?.enableApplications === 1}
                    />
                    <Label htmlFor="enableApplications">Enable online applications</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireResume"
                      name="requireResume"
                      defaultChecked={settings?.requireResume === 1}
                    />
                    <Label htmlFor="requireResume">Require resume upload</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireCoverLetter"
                      name="requireCoverLetter"
                      defaultChecked={settings?.requireCoverLetter === 1}
                    />
                    <Label htmlFor="requireCoverLetter">Require cover letter</Label>
                  </div>
                </div>
                <Button type="submit" disabled={updateSettingsMutation.isPending}>
                  Save Settings
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button onClick={() => window.open("/careers", "_blank")}>
            <Globe className="h-4 w-4 mr-2" />
            View Public Site
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.publishedJobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats?.totalJobs || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalViews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Job listing views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.newApplications || 0} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shortlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.shortlistedApplications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Candidates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Job Listings
            </CardTitle>
            <CardDescription>Manage published jobs on your career site</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.location}</p>
                      </div>
                      <Badge variant={job.status === "open" ? "default" : "secondary"}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedJobId(job.id);
                          setIsPublishOpen(true);
                        }}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Publish
                      </Button>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        0 views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No jobs yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Applications
            </CardTitle>
            <CardDescription>Latest applications from your career site</CardDescription>
          </CardHeader>
          <CardContent>
            {applications && applications.length > 0 ? (
              <div className="space-y-4">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {app.firstName} {app.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                      </div>
                      <Badge variant={app.status === "new" ? "default" : "secondary"}>
                        {app.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(app.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No applications yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publish Job Dialog */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Job</DialogTitle>
            <DialogDescription>Make this job visible on your public career site</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishJob} className="space-y-4">
            <div>
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="senior-software-engineer"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <div>
              <Label htmlFor="metaTitle">SEO Title</Label>
              <Input
                id="metaTitle"
                name="metaTitle"
                placeholder="Senior Software Engineer - Company Name"
              />
            </div>
            <div>
              <Label htmlFor="metaDescription">SEO Description</Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                placeholder="Join our team as a Senior Software Engineer..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <Button type="submit" disabled={publishMutation.isPending}>
              Publish Job
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
