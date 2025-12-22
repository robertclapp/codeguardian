import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Target, Users, BookOpen, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Skills Gap Analysis Dashboard
 * AI-powered skills matching and development tracking
 */
export default function SkillsGapAnalysis() {
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: orgSkillsGap } = trpc.skillsGap.getOrganizationSkillsGap.useQuery();
  const { data: skillTrends } = trpc.skillsGap.getSkillDevelopmentTrends.useQuery();
  const analyzeMutation = trpc.skillsGap.analyzeCandidateSkills.useMutation();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await analyzeMutation.mutateAsync({
        candidateId: parseInt(candidateId),
        jobId: parseInt(jobId),
      });

      setAnalysisResult(result);
      toast.success("Skills analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze skills");
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Skills Gap Analysis</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered skills matching and development tracking
            </p>
          </div>
          <Dialog open={isAnalyzeDialogOpen} onOpenChange={setIsAnalyzeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AI Skills Gap Analysis</DialogTitle>
                <DialogDescription>
                  Analyze candidate skills against job requirements
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="candidateId">Candidate ID *</Label>
                    <Input
                      id="candidateId"
                      type="number"
                      value={candidateId}
                      onChange={(e) => setCandidateId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobId">Job ID *</Label>
                    <Input
                      id="jobId"
                      type="number"
                      value={jobId}
                      onChange={(e) => setJobId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? "Analyzing..." : "Analyze Skills"}
                </Button>
              </form>

              {analysisResult && (
                <div className="mt-6 space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Overall Match</h3>
                      <span className="text-2xl font-bold">
                        {analysisResult.matchPercentage}%
                      </span>
                    </div>
                    <Progress value={analysisResult.matchPercentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-green-600">Matching Skills</h4>
                      <ul className="space-y-1">
                        {analysisResult.matchingSkills.map((skill: string, i: number) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Missing Skills</h4>
                      <ul className="space-y-1">
                        {analysisResult.missingSkills.map((skill: string, i: number) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <span className="text-red-600">✗</span>
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Training Recommendations</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Skill</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Resources</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.trainingRecommendations.map(
                          (rec: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{rec.skill}</TableCell>
                              <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                              <TableCell>{rec.estimatedTime}</TableCell>
                              <TableCell>
                                <ul className="text-sm space-y-1">
                                  {rec.resources.map((resource: string, j: number) => (
                                    <li key={j}>{resource}</li>
                                  ))}
                                </ul>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Overall Assessment</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysisResult.overallAssessment}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Required Skills</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orgSkillsGap?.totalRequiredSkills || 0}
              </div>
              <p className="text-xs text-muted-foreground">Across all open positions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Skills</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orgSkillsGap?.totalAvailableSkills || 0}
              </div>
              <p className="text-xs text-muted-foreground">In candidate pool</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Coverage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(orgSkillsGap?.averageCoverage || 0)}%
              </div>
              <p className="text-xs text-muted-foreground">Skills availability</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orgSkillsGap?.skillsGap.filter((s) => s.priority === "high").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Skills Gap Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Skills Gap</CardTitle>
            <CardDescription>
              Top skills needed vs. available in candidate pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!orgSkillsGap || orgSkillsGap.skillsGap.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p>No skills gap data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Gap</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgSkillsGap.skillsGap.map((skill, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{skill.skill}</TableCell>
                      <TableCell>{skill.required}</TableCell>
                      <TableCell>{skill.available}</TableCell>
                      <TableCell>
                        <span className="text-destructive font-medium">{skill.gap}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={skill.coverage} className="h-2 w-24" />
                          <span className="text-sm">{skill.coverage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(skill.priority)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Skills Development Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Skills Development Trends</CardTitle>
            <CardDescription>
              Track skill proficiency growth over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skillTrends && skillTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    type="category"
                    allowDuplicatedCategory={false}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  {skillTrends.map((trend, index) => (
                    <Line
                      key={index}
                      data={trend.timeline}
                      dataKey="proficiency"
                      name={trend.skill}
                      stroke={
                        ["#4F46E5", "#10B981", "#F59E0B"][index % 3]
                      }
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p>No trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Skills Gap Analysis Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">1. AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Compare candidate skills with job requirements
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">2. Identify Gaps</h3>
                <p className="text-sm text-muted-foreground">
                  Find missing skills and transferable abilities
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">3. Training Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized learning recommendations
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">4. Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor skill development over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
