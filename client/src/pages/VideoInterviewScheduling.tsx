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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, Users, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Video Interview Scheduling
 * Integrated calendar + AI analysis workflow
 */
export default function VideoInterviewScheduling() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    candidateId: "",
    interviewerIds: "",
    title: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  const { data: upcomingInterviews, refetch } =
    trpc.videoInterview.getUpcomingInterviews.useQuery();
  const scheduleMutation = trpc.videoInterview.scheduleInterview.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await scheduleMutation.mutateAsync({
        candidateId: parseInt(formData.candidateId),
        interviewerIds: formData.interviewerIds
          .split(",")
          .map((id) => parseInt(id.trim())),
        title: formData.title,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        description: formData.description,
      });

      toast.success(`Interview scheduled! Video link: ${result.videoLink}`);
      setIsDialogOpen(false);
      setFormData({
        candidateId: "",
        interviewerIds: "",
        title: "",
        startTime: "",
        endTime: "",
        description: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to schedule interview");
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Video Interview Scheduling</h1>
            <p className="text-muted-foreground mt-1">
              Schedule interviews with automatic calendar invites and AI analysis
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Video className="mr-2 h-4 w-4" />
                Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Video Interview</DialogTitle>
                <DialogDescription>
                  Create a video interview with automatic calendar invites and AI analysis
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
                    <Label htmlFor="interviewerIds">Interviewer IDs (comma-separated) *</Label>
                    <Input
                      id="interviewerIds"
                      value={formData.interviewerIds}
                      onChange={(e) =>
                        setFormData({ ...formData, interviewerIds: e.target.value })
                      }
                      placeholder="1, 2, 3"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Interview Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Senior Software Engineer - Technical Interview"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Interview agenda, topics to cover, etc."
                    rows={3}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Automatic Features
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Video meeting link generated automatically</li>
                    <li>• Calendar invites sent to all participants</li>
                    <li>• Reminder emails 24h and 1h before interview</li>
                    <li>• AI analysis triggered after interview completion</li>
                    <li>• Interview prep tips sent to candidate</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={scheduleMutation.isPending}
                >
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule Interview"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingInterviews?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingInterviews?.filter((i) => {
                  const start = new Date(i.startTime);
                  const weekFromNow = new Date();
                  weekFromNow.setDate(weekFromNow.getDate() + 7);
                  return start < weekFromNow;
                }).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Analysis Ready</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingInterviews?.filter(
                  (i) => i.metadata?.aiAnalysisEnabled
                ).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Auto-enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Interviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews</CardTitle>
            <CardDescription>
              Scheduled video interviews with automatic AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingInterviews || upcomingInterviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p>No upcoming interviews</p>
                <p className="text-sm">Schedule your first video interview to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interview</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Interviewers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingInterviews.map((interview) => (
                    <TableRow key={interview.id}>
                      <TableCell>
                        <div className="font-medium">{interview.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {interview.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(interview.startTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        Candidate #{interview.metadata?.candidateId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {interview.metadata?.interviewerIds?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{interview.status}</Badge>
                        {interview.metadata?.aiAnalysisEnabled && (
                          <Badge variant="secondary" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              interview.metadata?.videoLink || interview.location
                            );
                            toast.success("Video link copied!");
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Video Interview Scheduling Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">1. Schedule</h3>
                <p className="text-sm text-muted-foreground">
                  Pick date, time, and interviewers
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">2. Auto-Invite</h3>
                <p className="text-sm text-muted-foreground">
                  Calendar invites sent with video link
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">3. Conduct Interview</h3>
                <p className="text-sm text-muted-foreground">
                  Video call with automatic recording
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">4. AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Transcription, sentiment, key moments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
