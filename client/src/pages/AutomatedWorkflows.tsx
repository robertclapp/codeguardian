import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface Workflow {
  id: number;
  name: string;
  description: string;
  trigger: {
    type: string;
    condition: string;
  };
  action: {
    type: string;
    details: string;
  };
  isActive: boolean;
  executionCount: number;
}

/**
 * Automated Workflows Page
 * Create and manage rule-based automation workflows
 */
export default function AutomatedWorkflows() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  // Mock data - replace with tRPC query
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 1,
      name: "Auto-reject after 30 days",
      description: "Automatically send rejection emails to candidates who haven't progressed after 30 days",
      trigger: {
        type: "time_based",
        condition: "30 days in Applied stage",
      },
      action: {
        type: "send_email",
        details: "Send rejection email template",
      },
      isActive: true,
      executionCount: 45,
    },
    {
      id: 2,
      name: "Schedule interview on screening pass",
      description: "Automatically schedule interview when candidate passes screening",
      trigger: {
        type: "status_change",
        condition: "Moved to Interview stage",
      },
      action: {
        type: "schedule_interview",
        details: "Create calendar event",
      },
      isActive: true,
      executionCount: 23,
    },
    {
      id: 3,
      name: "Notify team on offer acceptance",
      description: "Send notification to hiring team when candidate accepts offer",
      trigger: {
        type: "status_change",
        condition: "Offer accepted",
      },
      action: {
        type: "notify_team",
        details: "Slack notification to #hiring channel",
      },
      isActive: false,
      executionCount: 0,
    },
  ]);

  const handleToggleActive = (id: number) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w))
    );
    const workflow = workflows.find((w) => w.id === id);
    toast.success(
      `Workflow "${workflow?.name}" ${workflow?.isActive ? "disabled" : "enabled"}`
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workflow deleted");
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Automated Workflows</h1>
            <p className="text-muted-foreground mt-1">
              Create rule-based automation to streamline your hiring process
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflows.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.filter((w) => w.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflows List */}
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <CardTitle>{workflow.name}</CardTitle>
                      {workflow.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(workflow.id)}
                    >
                      {workflow.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(workflow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(workflow.id, workflow.name)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Trigger
                    </div>
                    <div className="font-medium">{workflow.trigger.type}</div>
                    <div className="text-muted-foreground">
                      {workflow.trigger.condition}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Action
                    </div>
                    <div className="font-medium">{workflow.action.type}</div>
                    <div className="text-muted-foreground">
                      {workflow.action.details}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Executions
                    </div>
                    <div className="text-2xl font-bold">
                      {workflow.executionCount}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workflow Editor Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedWorkflow ? "Edit Workflow" : "Create New Workflow"}
              </DialogTitle>
              <DialogDescription>
                Define triggers and actions to automate your hiring process
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Auto-reject after 30 days"
                  defaultValue={selectedWorkflow?.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Describe what this workflow does"
                  defaultValue={selectedWorkflow?.description}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Trigger (When)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trigger-type">Trigger Type</Label>
                    <Select defaultValue={selectedWorkflow?.trigger.type || "status_change"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status_change">Status Change</SelectItem>
                        <SelectItem value="time_based">Time Based</SelectItem>
                        <SelectItem value="score_threshold">Score Threshold</SelectItem>
                        <SelectItem value="application_received">Application Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trigger-condition">Condition</Label>
                    <Input
                      id="trigger-condition"
                      placeholder="e.g., Moved to Interview"
                      defaultValue={selectedWorkflow?.trigger.condition}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Action (Then)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="action-type">Action Type</Label>
                    <Select defaultValue={selectedWorkflow?.action.type || "send_email"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_email">Send Email</SelectItem>
                        <SelectItem value="schedule_interview">Schedule Interview</SelectItem>
                        <SelectItem value="notify_team">Notify Team</SelectItem>
                        <SelectItem value="update_status">Update Status</SelectItem>
                        <SelectItem value="assign_task">Assign Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action-details">Details</Label>
                    <Input
                      id="action-details"
                      placeholder="e.g., Send rejection template"
                      defaultValue={selectedWorkflow?.action.details}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    defaultChecked={selectedWorkflow?.isActive ?? true}
                  />
                  <Label htmlFor="active">Enable workflow</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success("Workflow saved successfully");
                      setIsDialogOpen(false);
                    }}
                  >
                    Save Workflow
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
