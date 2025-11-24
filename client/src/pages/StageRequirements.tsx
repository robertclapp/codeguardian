import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, Trash2, Edit, FileText, GraduationCap, CheckCircle, ListTodo } from "lucide-react";
import { toast } from "sonner";

const REQUIREMENT_TYPES = [
  { value: "document", label: "Document", icon: FileText, description: "Upload required documents" },
  { value: "training", label: "Training", icon: GraduationCap, description: "Complete training modules" },
  { value: "approval", label: "Approval", icon: CheckCircle, description: "Manager/admin approval" },
  { value: "task", label: "Task", icon: ListTodo, description: "Complete specific tasks" },
];

export default function StageRequirements() {
  const [, params] = useRoute("/programs/:programId/stages/:stageId/requirements");
  const [, setLocation] = useLocation();
  const programId = params?.programId ? parseInt(params.programId) : 0;
  const stageId = params?.stageId ? parseInt(params.stageId) : 0;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [newRequirement, setNewRequirement] = useState({
    name: "",
    description: "",
    type: "document" as "document" | "training" | "approval" | "task",
    isRequired: true,
  });

  const utils = trpc.useUtils();
  const { data: requirements, isLoading } = trpc.programs.requirements.list.useQuery({ stageId });

  const createMutation = trpc.programs.requirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requirement created successfully");
      setIsCreateDialogOpen(false);
      setNewRequirement({ name: "", description: "", type: "document", isRequired: true });
      utils.programs.requirements.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create requirement: ${error.message}`);
    },
  });

  const updateMutation = trpc.programs.requirements.update.useMutation({
    onSuccess: () => {
      toast.success("Requirement updated successfully");
      setEditingRequirement(null);
      utils.programs.requirements.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update requirement: ${error.message}`);
    },
  });

  const deleteMutation = trpc.programs.requirements.delete.useMutation({
    onSuccess: () => {
      toast.success("Requirement deleted successfully");
      utils.programs.requirements.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete requirement: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newRequirement.name.trim()) {
      toast.error("Requirement name is required");
      return;
    }
    createMutation.mutate({
      stageId,
      ...newRequirement,
    });
  };

  const handleUpdate = () => {
    if (!editingRequirement?.name.trim()) {
      toast.error("Requirement name is required");
      return;
    }
    updateMutation.mutate({
      id: editingRequirement.id,
      name: editingRequirement.name,
      description: editingRequirement.description,
      type: editingRequirement.type,
      isRequired: editingRequirement.isRequired,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the requirement "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = REQUIREMENT_TYPES.find((t) => t.value === type);
    const Icon = typeConfig?.icon || FileText;
    return <Icon className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string) => {
    return REQUIREMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation(`/programs/${programId}/stages`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pipeline Stages
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Stage Requirements</h1>
          <p className="text-muted-foreground mt-2">
            Define what participants need to complete for this stage
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      {requirements && requirements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No requirements yet</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Add requirements like documents, training modules, approvals, or tasks that participants must complete
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Requirement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requirements?.map((requirement) => (
            <Card key={requirement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getTypeIcon(requirement.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{requirement.name}</CardTitle>
                        {requirement.isRequired === 1 && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getTypeLabel(requirement.type)}
                      </div>
                      <CardDescription className="mt-2">
                        {requirement.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingRequirement(requirement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(requirement.id, requirement.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Requirement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Requirement</DialogTitle>
            <DialogDescription>
              Create a new requirement for this pipeline stage
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Requirement Type *</Label>
              <Select
                value={newRequirement.type}
                onValueChange={(value: any) => setNewRequirement({ ...newRequirement, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUIREMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Requirement Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Background Check Clearance"
                value={newRequirement.name}
                onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what needs to be completed"
                value={newRequirement.description}
                onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-required">Required</Label>
                <div className="text-sm text-muted-foreground">
                  Must be completed to advance to next stage
                </div>
              </div>
              <Switch
                id="is-required"
                checked={newRequirement.isRequired}
                onCheckedChange={(checked) =>
                  setNewRequirement({ ...newRequirement, isRequired: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Requirement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Dialog */}
      <Dialog open={!!editingRequirement} onOpenChange={() => setEditingRequirement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Requirement</DialogTitle>
            <DialogDescription>
              Update requirement information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Requirement Type *</Label>
              <Select
                value={editingRequirement?.type || "document"}
                onValueChange={(value: any) =>
                  setEditingRequirement({ ...editingRequirement, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUIREMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Requirement Name *</Label>
              <Input
                id="edit-name"
                value={editingRequirement?.name || ""}
                onChange={(e) =>
                  setEditingRequirement({ ...editingRequirement, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingRequirement?.description || ""}
                onChange={(e) =>
                  setEditingRequirement({ ...editingRequirement, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-is-required">Required</Label>
                <div className="text-sm text-muted-foreground">
                  Must be completed to advance to next stage
                </div>
              </div>
              <Switch
                id="edit-is-required"
                checked={editingRequirement?.isRequired === 1}
                onCheckedChange={(checked) =>
                  setEditingRequirement({ ...editingRequirement, isRequired: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequirement(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
