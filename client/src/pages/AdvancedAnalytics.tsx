import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Target, Award, BarChart3 } from "lucide-react";

export default function AdvancedAnalytics() {
  // Fetch advanced analytics data
  const { data: cohorts, isLoading: cohortsLoading } =
    trpc.advancedAnalytics.getCohortAnalysis.useQuery({});
  const { data: retention, isLoading: retentionLoading } =
    trpc.advancedAnalytics.getRetentionMetrics.useQuery();
  const { data: programEffectiveness, isLoading: programLoading } =
    trpc.advancedAnalytics.getProgramEffectiveness.useQuery();
  const { data: successTrends, isLoading: trendsLoading } =
    trpc.advancedAnalytics.getSuccessRateTrends.useQuery({ months: 12 });

  const isLoading = cohortsLoading || retentionLoading || programLoading || trendsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Cohort analysis, retention metrics, and program effectiveness insights
        </p>
      </div>

      <Tabs defaultValue="cohorts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="retention">Retention Metrics</TabsTrigger>
          <TabsTrigger value="programs">Program Effectiveness</TabsTrigger>
          <TabsTrigger value="trends">Success Trends</TabsTrigger>
        </TabsList>

        {/* Cohort Analysis Tab */}
        <TabsContent value="cohorts" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cohorts?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cohorts && cohorts.length > 0
                    ? Math.round(
                        cohorts.reduce((sum, c) => sum + c.successRate, 0) / cohorts.length
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Placement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cohorts && cohorts.length > 0
                    ? Math.round(
                        cohorts.reduce((sum, c) => sum + c.placementRate, 0) / cohorts.length
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cohorts && cohorts.length > 0
                    ? Math.round(
                        cohorts.reduce((sum, c) => sum + c.avgCompletionTime, 0) / cohorts.length
                      )
                    : 0}{" "}
                  days
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cohort Performance</CardTitle>
              <CardDescription>Monthly cohort breakdown and success metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Placement Rate</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts && cohorts.length > 0 ? (
                    cohorts.map((cohort) => (
                      <TableRow key={cohort.cohortId}>
                        <TableCell className="font-medium">{cohort.cohortName}</TableCell>
                        <TableCell className="text-right">{cohort.totalCandidates}</TableCell>
                        <TableCell className="text-right">{cohort.completedCandidates}</TableCell>
                        <TableCell className="text-right">{cohort.activeCandidates}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cohort.successRate >= 70 ? "default" : "secondary"}>
                            {Math.round(cohort.successRate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cohort.placementRate >= 60 ? "default" : "secondary"}>
                            {Math.round(cohort.placementRate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(cohort.avgCompletionTime)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No cohort data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Metrics Tab */}
        <TabsContent value="retention" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {retention?.map((period) => (
              <Card key={period.period}>
                <CardHeader>
                  <CardTitle className="text-lg">{period.period}</CardTitle>
                  <CardDescription>{period.totalStarted} participants started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">30-Day Retention</span>
                    <Badge variant={period.retentionRate30 >= 80 ? "default" : "secondary"}>
                      {Math.round(period.retentionRate30)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">60-Day Retention</span>
                    <Badge variant={period.retentionRate60 >= 70 ? "default" : "secondary"}>
                      {Math.round(period.retentionRate60)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">90-Day Retention</span>
                    <Badge variant={period.retentionRate90 >= 60 ? "default" : "secondary"}>
                      {Math.round(period.retentionRate90)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Program Effectiveness Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Performance Comparison</CardTitle>
              <CardDescription>
                Compare effectiveness across all programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Participants</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                    <TableHead className="text-right">Placement Rate</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programEffectiveness && programEffectiveness.length > 0 ? (
                    programEffectiveness.map((program) => (
                      <TableRow key={program.programId}>
                        <TableCell className="font-medium">{program.programName}</TableCell>
                        <TableCell className="text-right">{program.totalParticipants}</TableCell>
                        <TableCell className="text-right">{program.activeParticipants}</TableCell>
                        <TableCell className="text-right">
                          {program.completedParticipants}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={program.completionRate >= 70 ? "default" : "secondary"}
                          >
                            {Math.round(program.completionRate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={program.placementRate >= 60 ? "default" : "secondary"}>
                            {Math.round(program.placementRate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{program.avgCompletionDays}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No program data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Success Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Success Rate Trends</CardTitle>
              <CardDescription>Monthly hiring success rates over the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {successTrends?.map((trend) => (
                  <div
                    key={trend.month}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{trend.month}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {trend.hiredCandidates} / {trend.totalCandidates} hired
                      </span>
                      <Badge variant={trend.successRate >= 50 ? "default" : "secondary"}>
                        {Math.round(trend.successRate)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
