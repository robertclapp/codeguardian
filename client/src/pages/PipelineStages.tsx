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
import { Plus, ArrowLeft, Trash2, Edit, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PipelineStages() {
  const [, params] = useRoute("/programs/:id/stages");
  const [, setLocation] = useLocation();
  const programId = params?.id ? parseInt(params.id) : 0;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [newStage, setNewStage] = useState({
    name: "",
    description: "",
    autoAdvance: false,
  });

  const utils = trpc.useUtils();
  const { data: program } = trpc.programs.getById.useQuery({ id: programId });
  const { data: stages, isLoading } = trpc.programs.stages.list.useQuery({ programId });

  const createMutation = trpc.programs.stages.create.useMutation({
    onSuccess: () => {
      toast.success("Stage created successfully");
      setIsCreateDialogOpen(false);
      setNewStage({ name: "", description: "", autoAdvance: false });
      utils.programs.stages.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create stage: ${error.message}`);
    },
  });

  const updateMutation = trpc.programs.stages.update.useMutation({
    onSuccess: () => {
      toast.success("Stage updated successfully");
      setEditingStage(null);
      utils.programs.stages.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update stage: ${error.message}`);
    },
  });

  const deleteMutation = trpc.programs.stages.delete.useMutation({
    onSuccess: () => {
      toast.success("Stage deleted successfully");
      utils.programs.stages.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete stage: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newStage.name.trim()) {
      toast.error("Stage name is required");
      return;
    }
    const nextOrder = stages ? stages.length + 1 : 1;
    createMutation.mutate({
      programId,
      ...newStage,
      order: nextOrder,
    });
  };

  const handleUpdate = () => {
    if (!editingStage?.name.trim()) {
      toast.error("Stage name is required");
      return;
    }
    updateMutation.mutate({
      id: editingStage.id,
      name: editingStage.name,
      description: editingStage.description,
      autoAdvance: editingStage.autoAdvance,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the stage "${name}"? This will also delete all associated requirements.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleMoveStage = (stageId: number, currentOrder: number, direction: "up" | "down") => {
    const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
    updateMutation.mutate({
      id: stageId,
      order: newOrder,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading pipeline stages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/programs")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Programs
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{program?.name} - Pipeline Stages</h1>
          <p className="text-muted-foreground mt-2">
            Configure the onboarding stages for this program
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
      </div>

      {stages && stages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No pipeline stages yet</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Create stages like "Application", "Background Check", "Training", "Onboarding Complete" to define your program's workflow
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Stage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stages?.map((stage, index) => (
            <Card key={stage.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveStage(stage.id, stage.order, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveStage(stage.id, stage.order, "down")}
                        disabled={index === (stages?.length || 0) - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Stage {stage.order}
                        </span>
                        <CardTitle>{stage.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-2">
                        {stage.description || "No description"}
                      </CardDescription>
                      {stage.autoAdvance === 1 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          ✓ Auto-advance enabled
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/programs/${programId}/stages/${stage.id}/requirements`)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Requirements
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingStage(stage)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(stage.id, stage.name)}
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

      {/* Create Stage Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pipeline Stage</DialogTitle>
            <DialogDescription>
              Create a new stage in the onboarding pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Stage Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Background Check"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what happens in this stage"
                value={newStage.description}
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-advance">Auto-advance</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically move to next stage when all requirements are met
                </div>
              </div>
              <Switch
                id="auto-advance"
                checked={newStage.autoAdvance}
                onCheckedChange={(checked) =>
                  setNewStage({ ...newStage, autoAdvance: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pipeline Stage</DialogTitle>
            <DialogDescription>
              Update stage information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Stage Name *</Label>
              <Input
                id="edit-name"
                value={editingStage?.name || ""}
                onChange={(e) =>
                  setEditingStage({ ...editingStage, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingStage?.description || ""}
                onChange={(e) =>
                  setEditingStage({ ...editingStage, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-auto-advance">Auto-advance</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically move to next stage when all requirements are met
                </div>
              </div>
              <Switch
                id="edit-auto-advance"
                checked={editingStage?.autoAdvance === 1}
                onCheckedChange={(checked) =>
                  setEditingStage({ ...editingStage, autoAdvance: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>
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
