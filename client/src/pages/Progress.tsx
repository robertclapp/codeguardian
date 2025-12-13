import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, Users, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Participant Progress Dashboard
 * Visual tracking of participants moving through program stages
 */
export default function Progress() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch programs for filter
  const { data: programs } = trpc.programs.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch progress data (we'll need to create this endpoint)
  const { data: progressData, isLoading, refetch } = trpc.programs.getProgressStats.useQuery(
    {
      programId: selectedProgram === "all" ? undefined : parseInt(selectedProgram),
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { enabled: !!user }
  );

  const handleExportCSV = () => {
    if (!progressData) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const headers = ["Participant", "Program", "Current Stage", "Progress %", "Status", "Time in Stage (days)"];
    const rows = progressData.participants.map((p: any) => [
      p.name,
      p.programName,
      p.currentStage,
      p.progressPercentage,
      p.status,
      p.daysInStage,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(",")),
    ].join("\\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Report exported successfully");
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
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Participant Progress</h1>
            <p className="text-muted-foreground mt-2">
              Track participants through program stages and identify bottlenecks
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
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
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="stalled">Stalled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : progressData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progressData.totalParticipants || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {progressData.totalPrograms || 0} programs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progressData.activeCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {progressData.totalParticipants > 0
                      ? Math.round((progressData.activeCount / progressData.totalParticipants) * 100)
                      : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progressData.completedCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {progressData.totalParticipants > 0
                      ? Math.round((progressData.completedCount / progressData.totalParticipants) * 100)
                      : 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stalled</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progressData.stalledCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bottleneck Identification */}
            {progressData.bottlenecks && progressData.bottlenecks.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Identified Bottlenecks
                  </CardTitle>
                  <CardDescription>
                    Stages with the most participants or longest average time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.bottlenecks.map((bottleneck: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                      >
                        <div>
                          <p className="font-medium">{bottleneck.stageName}</p>
                          <p className="text-sm text-muted-foreground">
                            Program: {bottleneck.programName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-600">
                            {bottleneck.participantCount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Avg: {bottleneck.avgDays} days
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participant List */}
            <Card>
              <CardHeader>
                <CardTitle>Participant Details</CardTitle>
                <CardDescription>
                  Individual progress tracking for all participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData.participants && progressData.participants.length > 0 ? (
                  <div className="space-y-4">
                    {progressData.participants.map((participant: any) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participant.programName} • {participant.currentStage}
                          </p>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${participant.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{participant.daysInStage} days</span>
                          </div>
                          <p className="text-sm font-medium mt-1">
                            {participant.progressPercentage}% complete
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No participants found</p>
                    <p className="text-sm text-muted-foreground">
                      Adjust your filters or add participants to programs
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No progress data available</p>
                <p className="text-sm text-muted-foreground">
                  Start adding participants to programs to track their progress
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </PullToRefresh>
    </DashboardLayout>
  );
}
