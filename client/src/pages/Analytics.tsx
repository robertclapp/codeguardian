import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  BarChart3,
  Activity
} from "lucide-react";

export default function Analytics() {
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(undefined);

  // Fetch data
  const { data: platformStats, isLoading: statsLoading } = trpc.analytics.getPlatformStats.useQuery();
  const { data: completionTrends } = trpc.analytics.getCompletionTrends.useQuery({
    programId: selectedProgramId,
  });
  const { data: timeToCompletion } = trpc.analytics.getTimeToCompletion.useQuery();
  const { data: bottlenecks } = trpc.analytics.getBottlenecks.useQuery();
  const { data: satisfactionMetrics } = trpc.analytics.getSatisfactionMetrics.useQuery();
  const { data: programs } = trpc.programs.list.useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Program Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Data-driven insights for program optimization and decision making
        </p>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalParticipants || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats?.activeParticipants || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats?.completedParticipants || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dropout Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.dropoutRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {platformStats?.droppedParticipants || 0} withdrawn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.activePrograms || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Programs running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time to Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Average Time to Completion</CardTitle>
          <CardDescription>How long it takes participants to complete each program</CardDescription>
        </CardHeader>
        <CardContent>
          {timeToCompletion && timeToCompletion.length > 0 ? (
            <div className="space-y-4">
              {timeToCompletion.map((metric) => (
                <div key={metric.programId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{metric.programName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {metric.totalCompleted} participant{metric.totalCompleted !== 1 ? "s" : ""} completed
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">{metric.averageDays}</span>
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Average</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Median: {metric.medianDays} days</div>
                      <div>Range: {metric.minDays} - {metric.maxDays} days</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No completion data available yet</p>
          )}
        </CardContent>
      </Card>

      {/* Bottleneck Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Bottleneck Analysis</CardTitle>
          <CardDescription>Stages where participants are spending the most time</CardDescription>
        </CardHeader>
        <CardContent>
          {bottlenecks && bottlenecks.length > 0 ? (
            <div className="space-y-3">
              {bottlenecks.slice(0, 10).map((bottleneck) => (
                <div key={`${bottleneck.programId}-${bottleneck.stageId}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{bottleneck.stageName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {bottleneck.programName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Avg time: {bottleneck.averageTimeInStage} days</span>
                      <span>Completion: {bottleneck.completionRate}%</span>
                    </div>
                  </div>
                  {bottleneck.participantsStuck > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div className="text-right">
                        <div className="font-semibold text-yellow-600">{bottleneck.participantsStuck}</div>
                        <div className="text-xs text-muted-foreground">stuck</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No bottleneck data available yet</p>
          )}
        </CardContent>
      </Card>

      {/* Participant Satisfaction Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Program Performance Metrics</CardTitle>
          <CardDescription>Overall program health and participant outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {satisfactionMetrics && satisfactionMetrics.length > 0 ? (
            <div className="space-y-4">
              {satisfactionMetrics.map((metric) => (
                <div key={metric.programId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">{metric.programName}</h4>
                    <Badge variant="outline">
                      {metric.totalParticipants} participant{metric.totalParticipants !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {metric.completionRate >= 70 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-2xl font-bold">{metric.completionRate}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                    </div>

                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold mb-1">{metric.averageProgressPercentage}%</div>
                      <p className="text-xs text-muted-foreground">Avg Progress</p>
                    </div>

                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold mb-1">{metric.onTimeCompletionRate}%</div>
                      <p className="text-xs text-muted-foreground">On-Time Completion</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No performance data available yet</p>
          )}
        </CardContent>
      </Card>

      {/* Completion Trends */}
      {completionTrends && completionTrends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Completion Trends</CardTitle>
                <CardDescription>Participant status over time</CardDescription>
              </div>
              <Select
                value={selectedProgramId?.toString() || "all"}
                onValueChange={(value) => setSelectedProgramId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs?.map((program: any) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completionTrends.slice(-10).map((trend) => (
                <div key={trend.date} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-24 text-sm font-medium">{new Date(trend.date).toLocaleDateString()}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>{trend.completed} completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>{trend.active} active</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>{trend.dropped} withdrawn</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
