import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight,
  Settings,
  Eye,
  EyeOff,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Main dashboard page with drag-and-drop widget customization
 * Shows overview of jobs, candidates, and key metrics
 */

type WidgetId = "totalJobs" | "activeCandidates" | "matchScore" | "timeToHire" | "quickActions" | "recentActivity" | "gettingStarted";

type DashboardConfig = {
  layout: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  visibility: Record<WidgetId, boolean>;
  dateRange: string;
};

const DEFAULT_LAYOUT = [
  { i: "totalJobs", x: 0, y: 0, w: 3, h: 2 },
  { i: "activeCandidates", x: 3, y: 0, w: 3, h: 2 },
  { i: "matchScore", x: 6, y: 0, w: 3, h: 2 },
  { i: "timeToHire", x: 9, y: 0, w: 3, h: 2 },
  { i: "quickActions", x: 0, y: 2, w: 6, h: 4 },
  { i: "recentActivity", x: 6, y: 2, w: 6, h: 4 },
  { i: "gettingStarted", x: 0, y: 6, w: 12, h: 4 },
];

const DEFAULT_VISIBILITY: Record<WidgetId, boolean> = {
  totalJobs: true,
  activeCandidates: true,
  matchScore: true,
  timeToHire: true,
  quickActions: true,
  recentActivity: true,
  gettingStarted: true,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery();
  
  // Dashboard configuration state
  const [config, setConfig] = useState<DashboardConfig>({
    layout: DEFAULT_LAYOUT,
    visibility: DEFAULT_VISIBILITY,
    dateRange: "last30days",
  });
  
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Load saved layout from server
  const { data: savedLayout } = trpc.dashboard.getLayout.useQuery();
  const saveLayoutMutation = trpc.dashboard.saveLayout.useMutation();

  useEffect(() => {
    if (savedLayout) {
      setConfig({
        layout: JSON.parse(savedLayout.layoutData),
        visibility: JSON.parse(savedLayout.widgetVisibility),
        dateRange: savedLayout.dateRangePreset,
      });
    }
  }, [savedLayout]);

  // Calculate aggregate stats
  const totalJobs = jobs?.length || 0;
  const openJobs = jobs?.filter(j => j.status === "open").length || 0;

  const handleLayoutChange = (newLayout: any) => {
    setConfig(prev => ({ ...prev, layout: newLayout }));
  };

  const handleSaveLayout = () => {
    saveLayoutMutation.mutate({
      layoutData: JSON.stringify(config.layout),
      widgetVisibility: JSON.stringify(config.visibility),
      dateRangePreset: config.dateRange,
    });
    setIsCustomizing(false);
    alert("Dashboard layout saved!");
  };

  const toggleWidgetVisibility = (widgetId: WidgetId) => {
    setConfig(prev => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [widgetId]: !prev.visibility[widgetId],
      },
    }));
  };

  const resetLayout = () => {
    setConfig({
      layout: DEFAULT_LAYOUT,
      visibility: DEFAULT_VISIBILITY,
      dateRange: "last30days",
    });
  };

  // Filter layout to only show visible widgets
  const visibleLayout = config.layout.filter(item => config.visibility[item.i as WidgetId]);

  return (
    <DashboardLayout>
      <OnboardingTutorial />
      <div className="space-y-6">
        {/* Header with customization controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || "there"}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening with your recruitment today.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Customize Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Customize Your Dashboard</DialogTitle>
                <DialogDescription>
                  Show/hide widgets and adjust date ranges. Drag widgets on the dashboard to rearrange them.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Widget Visibility */}
                <div>
                  <h3 className="font-semibold mb-3">Widget Visibility</h3>
                  <div className="space-y-3">
                    {Object.entries(config.visibility).map(([widgetId, visible]) => (
                      <div key={widgetId} className="flex items-center space-x-2">
                        <Checkbox
                          id={widgetId}
                          checked={visible}
                          onCheckedChange={() => toggleWidgetVisibility(widgetId as WidgetId)}
                        />
                        <Label htmlFor={widgetId} className="cursor-pointer capitalize">
                          {widgetId === "gettingStarted" ? "Getting Started Guide" : widgetId.replace(/([A-Z])/g, " $1").trim()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <h3 className="font-semibold mb-3">Analytics Date Range</h3>
                  <Select
                    value={config.dateRange}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, dateRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                      <SelectItem value="last90days">Last 90 Days</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="allTime">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleSaveLayout} className="flex-1">
                    Save Layout
                  </Button>
                  <Button onClick={resetLayout} variant="outline">
                    Reset to Default
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Drag-and-drop grid layout */}
        {/* @ts-ignore - GridLayout type definitions are incomplete */}
        <GridLayout
          className="layout"
          layout={visibleLayout}
          cols={12}
          rowHeight={60}
          width={1200}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          compactType="vertical" as any
          preventCollision={false}
        >
          {/* Total Jobs Widget */}
          {config.visibility.totalJobs && (
            <div key="totalJobs" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    {openJobs} currently open
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Candidates Widget */}
          {config.visibility.activeCandidates && (
            <div key="activeCandidates" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Across all positions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Match Score Widget */}
          {config.visibility.matchScore && (
            <div key="matchScore" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Match Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">
                    AI-powered matching
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Time to Hire Widget */}
          {config.visibility.timeToHire && (
            <div key="timeToHire" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Time to Hire</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">
                    Average days ({config.dateRange.replace(/([A-Z])/g, " $1").toLowerCase()})
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions Widget */}
          {config.visibility.quickActions && (
            <div key="quickActions" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Get started with common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" asChild>
                    <Link href="/jobs/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Job Posting
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/jobs">
                      <Briefcase className="mr-2 h-4 w-4" />
                      View All Jobs
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/assistant">
                      <Users className="mr-2 h-4 w-4" />
                      Get AI Help
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity Widget */}
          {config.visibility.recentActivity && (
            <div key="recentActivity" className="dashboard-widget">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates across your jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : jobs && jobs.length > 0 ? (
                    <div className="space-y-3">
                      {jobs.slice(0, 3).map((job: any) => (
                        <div key={job.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{job.title}</p>
                            <p className="text-xs text-gray-500">
                              {job.status === "open" ? "Accepting applications" : `Status: ${job.status}`}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/jobs/${job.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-4">No jobs yet</p>
                      <Button size="sm" asChild>
                        <Link href="/jobs/new">Create Your First Job</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Getting Started Widget */}
          {config.visibility.gettingStarted && totalJobs === 0 && (
            <div key="gettingStarted" className="dashboard-widget">
              <Card className="h-full border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle>🎉 Welcome to Your AI-Powered HR Platform!</CardTitle>
                  <CardDescription>
                    Let's get you set up in just a few minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Create your first job posting</p>
                        <p className="text-sm text-gray-600">
                          Use our AI job description generator to create compelling postings in seconds
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-white text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Share your job posting</p>
                        <p className="text-sm text-gray-600">
                          Get a public link to share on job boards, social media, or your website
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-white text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Let AI do the heavy lifting</p>
                        <p className="text-sm text-gray-600">
                          Our AI automatically scores candidates and helps you find the best matches
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href="/jobs/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Job
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </GridLayout>
      </div>

      <style>{`
        .dashboard-widget {
          cursor: move;
        }
        .dashboard-widget:hover {
          opacity: 0.9;
        }
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--primary) / 0.2);
          border-radius: 8px;
        }
        .react-grid-item {
          transition: all 200ms ease;
        }
        .react-grid-item.resizing {
          opacity: 0.9;
        }
      `}</style>
    </DashboardLayout>
  );
}
