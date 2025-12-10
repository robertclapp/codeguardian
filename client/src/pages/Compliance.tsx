import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, TrendingUp, Users, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Compliance() {
  // Using sonner toast for notifications
  const [selectedProgram, setSelectedProgram] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "withdrawn" | undefined>();

  // Fetch programs for filter
  const { data: programs } = trpc.programs.list.useQuery();

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = trpc.compliance.getDashboardSummary.useQuery({
    programId: selectedProgram,
    startDate,
    endDate,
  });

  // Fetch participant report
  const { data: participants, isLoading: participantsLoading } = trpc.compliance.getParticipantReport.useQuery({
    programId: selectedProgram,
    status: statusFilter,
    startDate,
    endDate,
  });

  // Fetch program outcomes
  const { data: outcomes } = trpc.compliance.getProgramOutcomesReport.useQuery(
    {
      programId: selectedProgram!,
      startDate,
      endDate,
    },
    {
      enabled: !!selectedProgram,
    }
  );

  // Export report mutation
  const exportReport = trpc.compliance.exportReportCSV.useMutation({
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${data.filename}`);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = (reportType: "participants" | "programs" | "outcomes") => {
    exportReport.mutate({
      reportType,
      programId: selectedProgram,
      status: statusFilter,
      startDate,
      endDate,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "active":
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
      case "withdrawn":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Withdrawn</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Reporting</h1>
        <p className="text-muted-foreground mt-2">
          Generate reports for state compliance requirements and funder reporting
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select program and date range to filter reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-filter">Program</Label>
              <Select
                value={selectedProgram?.toString() || "all"}
                onValueChange={(value) => setSelectedProgram(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger id="program-filter">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? undefined : value as any)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                {summary.activeParticipants} active, {summary.completedParticipants} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {summary.completedParticipants} of {summary.totalParticipants} participants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageCompletionDays} days</div>
              <p className="text-xs text-muted-foreground">
                From enrollment to completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTrainingHours}</div>
              <p className="text-xs text-muted-foreground">
                Total estimated training hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for different reports */}
      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">Participant Report</TabsTrigger>
          <TabsTrigger value="programs">Program Breakdown</TabsTrigger>
          {selectedProgram && <TabsTrigger value="outcomes">Program Outcomes</TabsTrigger>}
        </TabsList>

        {/* Participant Report Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Participant Report</CardTitle>
                <CardDescription>Detailed participant progress and completion data</CardDescription>
              </div>
              <Button
                onClick={() => handleExport("participants")}
                disabled={exportReport.isPending}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {participantsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading participants...</div>
              ) : !participants || participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No participants found for the selected filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Current Stage</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Days in Program</TableHead>
                        <TableHead>Enrolled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.participantId}>
                          <TableCell className="font-medium">
                            {participant.candidateName}
                            <div className="text-xs text-muted-foreground">{participant.candidateEmail}</div>
                          </TableCell>
                          <TableCell>{participant.programName}</TableCell>
                          <TableCell>{getStatusBadge(participant.status)}</TableCell>
                          <TableCell>{participant.currentStage}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${participant.progress}%` }}
                                />
                              </div>
                              <span className="text-sm">{participant.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{participant.daysInProgram}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(participant.enrolledAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Program Breakdown Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Program Breakdown</CardTitle>
                <CardDescription>Performance metrics by program</CardDescription>
              </div>
              <Button
                onClick={() => handleExport("programs")}
                disabled={exportReport.isPending}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading programs...</div>
              ) : !summary?.programBreakdown || summary.programBreakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No program data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Completion Rate</TableHead>
                        <TableHead>Avg. Days</TableHead>
                        <TableHead>Training Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.programBreakdown.map((program) => (
                        <TableRow key={program.programId}>
                          <TableCell className="font-medium">{program.programName}</TableCell>
                          <TableCell>{program.totalParticipants}</TableCell>
                          <TableCell>{program.activeParticipants}</TableCell>
                          <TableCell>{program.completedParticipants}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{program.completionRate}%</Badge>
                          </TableCell>
                          <TableCell>{program.averageCompletionDays}</TableCell>
                          <TableCell>{program.totalTrainingHours}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Program Outcomes Tab */}
        {selectedProgram && outcomes && (
          <TabsContent value="outcomes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Program Outcomes: {outcomes.programName}</CardTitle>
                  <CardDescription>
                    Detailed outcomes and stage progression analysis
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleExport("outcomes")}
                  disabled={exportReport.isPending}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Enrolled</p>
                    <p className="text-2xl font-bold">{outcomes.summary.totalEnrolled}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{outcomes.summary.completed}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-blue-600">{outcomes.summary.active}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Withdrawn</p>
                    <p className="text-2xl font-bold text-red-600">{outcomes.summary.withdrawn}</p>
                  </div>
                </div>

                {/* Stage Progression */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Stage Progression</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead>Currently At Stage</TableHead>
                        <TableHead>Completed Stage</TableHead>
                        <TableHead>Drop-off Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outcomes.stageProgression.map((stage) => (
                        <TableRow key={stage.stageId}>
                          <TableCell className="font-medium">{stage.stageName}</TableCell>
                          <TableCell>{stage.currentlyAtStage}</TableCell>
                          <TableCell>{stage.completedStage}</TableCell>
                          <TableCell>
                            <Badge variant={stage.dropoffRate > 20 ? "destructive" : "outline"}>
                              {stage.dropoffRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
