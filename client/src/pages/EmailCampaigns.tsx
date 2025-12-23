import { useState } from "react";
import { trpc } from "../lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
  Mail, Plus, Play, Pause, Trash2, Edit, Copy, 
  Users, Send, Eye, MousePointer, Clock, Zap,
  ChevronRight, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

/**
 * Email Campaigns Management Page
 * Create and manage automated drip campaigns for candidate nurturing
 */
export default function EmailCampaigns() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"pipeline_stage_change" | "time_based" | "manual">("pipeline_stage_change");
  const [triggerStage, setTriggerStage] = useState("");
  const [steps, setSteps] = useState<Array<{
    subject: string;
    body: string;
    delayDays: number;
    delayHours: number;
  }>>([{ subject: "", body: "", delayDays: 0, delayHours: 1 }]);

  const { data: campaigns, refetch } = trpc.emailCampaigns.list.useQuery();
  const { data: stats } = trpc.emailCampaigns.getStats.useQuery();
  const { data: templates } = trpc.emailCampaigns.getTemplates.useQuery();

  const createMutation = trpc.emailCampaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleMutation = trpc.emailCampaigns.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Campaign activated" : "Campaign paused");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.emailCampaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setTriggerType("pipeline_stage_change");
    setTriggerStage("");
    setSteps([{ subject: "", body: "", delayDays: 0, delayHours: 1 }]);
    setSelectedTemplate(null);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setTriggerType(template.triggerType as any);
      setTriggerStage(template.triggerStage);
      setSteps(template.steps);
      setSelectedTemplate(templateId);
    }
  };

  const addStep = () => {
    setSteps([...steps, { subject: "", body: "", delayDays: 1, delayHours: 0 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: string, value: string | number) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;
    setSteps(newSteps);
  };

  const handleCreate = () => {
    if (!name || steps.some(s => !s.subject || !s.body)) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      name,
      description,
      triggerType,
      triggerStage: triggerStage || undefined,
      steps,
    });
  };

  const pipelineStages = [
    "applied", "screening", "interview", "assessment", "offer", "hired", "rejected"
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground">
              Automate candidate nurturing with drip email sequences
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeEnrollments || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.emailsSent || 0}</p>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.emailsSent ? Math.round((stats.emailsOpened / stats.emailsSent) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${campaign.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                        <Mail className={`h-6 w-6 ${campaign.isActive ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <Badge variant={campaign.isActive ? "default" : "secondary"}>
                            {campaign.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {campaign.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            Trigger: {campaign.triggerType.replace(/_/g, " ")}
                            {campaign.triggerStage && ` (${campaign.triggerStage})`}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChevronRight className="h-4 w-4" />
                            {campaign.stepCount} steps
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {campaign.activeEnrollments} active
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={campaign.isActive || false}
                        onCheckedChange={() => toggleMutation.mutate({ id: campaign.id })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCampaign(campaign.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Duplicate feature coming soon")}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm("Delete this campaign?")) {
                                deleteMutation.mutate({ id: campaign.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email campaign to start nurturing candidates
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Campaign Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Set up an automated email sequence for candidate nurturing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <Label>Start from Template (Optional)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {templates?.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate === template.id ? "border-primary" : ""
                      }`}
                      onClick={() => applyTemplate(template.id)}
                    >
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Welcome Series"
                  />
                </div>
                <div>
                  <Label htmlFor="trigger">Trigger Type *</Label>
                  <Select value={triggerType} onValueChange={(v: any) => setTriggerType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pipeline_stage_change">Pipeline Stage Change</SelectItem>
                      <SelectItem value="time_based">Time Based</SelectItem>
                      <SelectItem value="manual">Manual Enrollment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {triggerType === "pipeline_stage_change" && (
                <div>
                  <Label htmlFor="stage">Trigger Stage</Label>
                  <Select value={triggerStage} onValueChange={setTriggerStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this campaign..."
                  rows={2}
                />
              </div>

              {/* Email Steps */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Email Steps</Label>
                  <Button variant="outline" size="sm" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Step {index + 1}</CardTitle>
                          {steps.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeStep(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label>Delay</Label>
                            <div className="flex gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={step.delayDays}
                                  onChange={(e) => updateStep(index, "delayDays", parseInt(e.target.value) || 0)}
                                  className="w-16"
                                />
                                <span className="text-sm text-muted-foreground">days</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="23"
                                  value={step.delayHours}
                                  onChange={(e) => updateStep(index, "delayHours", parseInt(e.target.value) || 0)}
                                  className="w-16"
                                />
                                <span className="text-sm text-muted-foreground">hours</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Subject *</Label>
                          <Input
                            value={step.subject}
                            onChange={(e) => updateStep(index, "subject", e.target.value)}
                            placeholder="Email subject line"
                          />
                        </div>
                        <div>
                          <Label>Body *</Label>
                          <Textarea
                            value={step.body}
                            onChange={(e) => updateStep(index, "body", e.target.value)}
                            placeholder="Email body content..."
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Available variables: {"{{candidateName}}"}, {"{{jobTitle}}"}, {"{{companyName}}"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
