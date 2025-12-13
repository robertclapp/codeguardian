import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Users, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Interview {
  id: number;
  title: string;
  start: Date;
  end: Date;
  candidateName: string;
  jobTitle: string;
  interviewerName: string;
  location: string;
  status: "scheduled" | "completed" | "cancelled";
}

/**
 * Interview Scheduler Page
 * Calendar view for scheduling and managing interviews
 */
export default function InterviewScheduler() {
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewInterview, setIsNewInterview] = useState(false);

  // Mock data - replace with tRPC query
  const [interviews, setInterviews] = useState<Interview[]>([
    {
      id: 1,
      title: "Interview: John Doe - Software Engineer",
      start: new Date(2025, 11, 15, 14, 0),
      end: new Date(2025, 11, 15, 15, 0),
      candidateName: "John Doe",
      jobTitle: "Software Engineer",
      interviewerName: "Jane Smith",
      location: "Conference Room A",
      status: "scheduled",
    },
    {
      id: 2,
      title: "Interview: Sarah Johnson - Product Manager",
      start: new Date(2025, 11, 16, 10, 0),
      end: new Date(2025, 11, 16, 11, 0),
      candidateName: "Sarah Johnson",
      jobTitle: "Product Manager",
      interviewerName: "Mike Brown",
      location: "Virtual - Zoom",
      status: "scheduled",
    },
  ]);

  const handleSelectSlot = (slotInfo: any) => {
    // Check for conflicts
    const hasConflict = interviews.some(
      (interview) =>
        interview.start < slotInfo.end && interview.end > slotInfo.start
    );

    if (hasConflict) {
      toast.error("Time slot conflicts with existing interview");
      return;
    }

    setSelectedInterview({
      id: 0,
      title: "",
      start: slotInfo.start,
      end: slotInfo.end,
      candidateName: "",
      jobTitle: "",
      interviewerName: "",
      location: "",
      status: "scheduled",
    });
    setIsNewInterview(true);
    setIsDialogOpen(true);
  };

  const handleSelectEvent = (event: Interview) => {
    setSelectedInterview(event);
    setIsNewInterview(false);
    setIsDialogOpen(true);
  };

  const handleSaveInterview = () => {
    if (!selectedInterview) return;

    if (isNewInterview) {
      const newInterview = {
        ...selectedInterview,
        id: interviews.length + 1,
        title: `Interview: ${selectedInterview.candidateName} - ${selectedInterview.jobTitle}`,
      };
      setInterviews([...interviews, newInterview]);
      toast.success("Interview scheduled successfully");
    } else {
      setInterviews(
        interviews.map((i) =>
          i.id === selectedInterview.id ? selectedInterview : i
        )
      );
      toast.success("Interview updated successfully");
    }

    setIsDialogOpen(false);
    setSelectedInterview(null);
  };

  const handleCancelInterview = () => {
    if (!selectedInterview) return;

    if (confirm("Are you sure you want to cancel this interview?")) {
      setInterviews(
        interviews.map((i) =>
          i.id === selectedInterview.id ? { ...i, status: "cancelled" as const } : i
        )
      );
      toast.success("Interview cancelled");
      setIsDialogOpen(false);
    }
  };

  const eventStyleGetter = (event: Interview) => {
    let backgroundColor = "#3b82f6"; // blue for scheduled
    if (event.status === "completed") backgroundColor = "#10b981"; // green
    if (event.status === "cancelled") backgroundColor = "#ef4444"; // red

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: event.status === "cancelled" ? 0.5 : 1,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interview Scheduler</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage candidate interviews
            </p>
          </div>
          <Button onClick={() => {
            setSelectedInterview({
              id: 0,
              title: "",
              start: new Date(),
              end: new Date(Date.now() + 60 * 60 * 1000),
              candidateName: "",
              jobTitle: "",
              interviewerName: "",
              location: "",
              status: "scheduled",
            });
            setIsNewInterview(true);
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {interviews.filter((i) => i.status === "scheduled").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {interviews.filter((i) => i.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  interviews.filter(
                    (i) =>
                      i.start >= new Date() &&
                      i.start <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardContent className="p-6">
            <div style={{ height: "600px" }}>
              <Calendar
                localizer={localizer}
                events={interviews}
                startAccessor="start"
                endAccessor="end"
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable
                eventPropGetter={eventStyleGetter}
                views={["month", "week", "day"]}
                defaultView="week"
                step={30}
                showMultiDayTimes
              />
            </div>
          </CardContent>
        </Card>

        {/* Interview Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isNewInterview ? "Schedule Interview" : "Interview Details"}
              </DialogTitle>
              <DialogDescription>
                {isNewInterview
                  ? "Fill in the details to schedule a new interview"
                  : "View and manage interview details"}
              </DialogDescription>
            </DialogHeader>
            {selectedInterview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="candidate">Candidate Name</Label>
                    <Input
                      id="candidate"
                      value={selectedInterview.candidateName}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          candidateName: e.target.value,
                        })
                      }
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job">Job Title</Label>
                    <Input
                      id="job"
                      value={selectedInterview.jobTitle}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          jobTitle: e.target.value,
                        })
                      }
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interviewer">Interviewer</Label>
                    <Input
                      id="interviewer"
                      value={selectedInterview.interviewerName}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          interviewerName: e.target.value,
                        })
                      }
                      placeholder="e.g., Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={selectedInterview.location}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          location: e.target.value,
                        })
                      }
                      placeholder="e.g., Conference Room A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input
                      id="start"
                      type="datetime-local"
                      value={format(
                        selectedInterview.start,
                        "yyyy-MM-dd'T'HH:mm"
                      )}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          start: new Date(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input
                      id="end"
                      type="datetime-local"
                      value={format(selectedInterview.end, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          end: new Date(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {!isNewInterview && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedInterview.status}
                      onValueChange={(value: any) =>
                        setSelectedInterview({
                          ...selectedInterview,
                          status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  {!isNewInterview && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelInterview}
                    >
                      Cancel Interview
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={handleSaveInterview}>
                    {isNewInterview ? "Schedule" : "Update"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
