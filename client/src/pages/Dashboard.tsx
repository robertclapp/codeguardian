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
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import OnboardingTutorial from "@/components/OnboardingTutorial";

/**
 * Main dashboard page
 * Shows overview of jobs, candidates, and key metrics
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery();

  // Calculate aggregate stats
  const totalJobs = jobs?.length || 0;
  const openJobs = jobs?.filter(j => j.status === "open").length || 0;
  const draftJobs = jobs?.filter(j => j.status === "draft").length || 0;

  return (
    <DashboardLayout>
      <OnboardingTutorial />
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || "there"}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your recruitment today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
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

          <Card>
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

          <Card>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time to Hire</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                Average days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
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

          <Card>
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
                  {jobs.slice(0, 3).map((job) => (
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

        {/* Getting Started Guide */}
        {totalJobs === 0 && (
          <Card className="border-2 border-primary/20 bg-primary/5">
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
                  <div className="flex h-6 w-6 shrink-0 items-center justify-between rounded-full bg-gray-300 text-white text-sm font-bold">
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
              <Button className="w-full" size="lg" asChild>
                <Link href="/jobs/new">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Job
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
