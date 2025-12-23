import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Plus, Target, TrendingUp, Users, Award, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceReviews() {
  const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);

  const { data: stats } = trpc.performanceReviews.getReviewStats.useQuery();
  const { data: cycles } = trpc.performanceReviews.listReviewCycles.useQuery();
  const { data: myGoals } = trpc.performanceReviews.listEmployeeGoals.useQuery({ employeeId: 1 }); // TODO: Use actual user ID

  const createCycleMutation = trpc.performanceReviews.createReviewCycle.useMutation({
    onSuccess: () => {
      toast.success("Review cycle created successfully");
      setIsCreateCycleOpen(false);
    },
  });

  const createGoalMutation = trpc.performanceReviews.createGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal created successfully");
      setIsCreateGoalOpen(false);
    },
  });

  const handleCreateCycle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCycleMutation.mutate({
      name: formData.get("name") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      reviewType: formData.get("reviewType") as "annual" | "quarterly" | "probation" | "custom",
      description: formData.get("description") as string,
    });
  };

  const handleCreateGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createGoalMutation.mutate({
      employeeId: 1, // TODO: Use actual user ID
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as "performance" | "development" | "project" | "okr",
      targetDate: formData.get("targetDate") as string,
      priority: formData.get("priority") as "low" | "medium" | "high",
    });
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground">360-degree feedback and goal tracking</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateGoalOpen} onOpenChange={setIsCreateGoalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>Set a new performance or development goal</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <Label htmlFor="title">Goal Title</Label>
                  <Input id="title" name="title" required placeholder="Improve customer satisfaction" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Detailed description of the goal..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="okr">OKR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input id="targetDate" name="targetDate" type="date" />
                </div>
                <Button type="submit" disabled={createGoalMutation.isPending}>
                  Create Goal
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateCycleOpen} onOpenChange={setIsCreateCycleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Review Cycle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Review Cycle</DialogTitle>
                <DialogDescription>Set up a new performance review cycle</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCycle} className="space-y-4">
                <div>
                  <Label htmlFor="name">Cycle Name</Label>
                  <Input id="name" name="name" required placeholder="Q1 2025 Reviews" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reviewType">Review Type</Label>
                  <Select name="reviewType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Optional description..." />
                </div>
                <Button type="submit" disabled={createCycleMutation.isPending}>
                  Create Cycle
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedReviews || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.averageRating.toFixed(1) || "N/A"}</div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Award
                  key={star}
                  className={`h-4 w-4 ${star <= (stats?.averageRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.inProgressGoals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedGoals || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting completion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Review Cycles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Review Cycles
            </CardTitle>
            <CardDescription>Scheduled performance review periods</CardDescription>
          </CardHeader>
          <CardContent>
            {cycles && cycles.length > 0 ? (
              <div className="space-y-4">
                {cycles.map((cycle) => (
                  <div key={cycle.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{cycle.name}</h3>
                      <Badge variant={cycle.status === "active" ? "default" : "secondary"}>
                        {cycle.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{cycle.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                      </span>
                      <Badge variant="outline">{cycle.reviewType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No review cycles yet</p>
            )}
          </CardContent>
        </Card>

        {/* My Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              My Goals
            </CardTitle>
            <CardDescription>Track your performance and development goals</CardDescription>
          </CardHeader>
          <CardContent>
            {myGoals && myGoals.length > 0 ? (
              <div className="space-y-4">
                {myGoals.map((goal) => (
                  <div key={goal.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{goal.title}</h3>
                      <Badge variant={goal.priority === "high" ? "destructive" : goal.priority === "medium" ? "default" : "secondary"}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress || 0} />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline">{goal.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {goal.targetDate ? `Due ${new Date(goal.targetDate).toLocaleDateString()}` : "No deadline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No goals set yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
