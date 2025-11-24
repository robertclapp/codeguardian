import { useState } from "react";
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
import { Plus, Settings, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Programs() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [newProgram, setNewProgram] = useState({ name: "", description: "" });

  const utils = trpc.useUtils();
  const { data: programs, isLoading } = trpc.programs.list.useQuery();

  const createMutation = trpc.programs.create.useMutation({
    onSuccess: () => {
      toast.success("Program created successfully");
      setIsCreateDialogOpen(false);
      setNewProgram({ name: "", description: "" });
      utils.programs.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create program: ${error.message}`);
    },
  });

  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      toast.success("Program updated successfully");
      setEditingProgram(null);
      utils.programs.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update program: ${error.message}`);
    },
  });

  const deleteMutation = trpc.programs.delete.useMutation({
    onSuccess: () => {
      toast.success("Program deleted successfully");
      utils.programs.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete program: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newProgram.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    createMutation.mutate(newProgram);
  };

  const handleUpdate = () => {
    if (!editingProgram?.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    updateMutation.mutate({
      id: editingProgram.id,
      name: editingProgram.name,
      description: editingProgram.description,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the program "${name}"? This will also delete all associated pipeline stages and requirements.`)) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Programs</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organizational programs and their onboarding pipelines
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Program
        </Button>
      </div>

      {programs && programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No programs yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs?.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{program.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {program.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingProgram(program)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(program.id, program.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    Status: {program.isActive ? "Active" : "Inactive"}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation(`/programs/${program.id}/stages`)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Program Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Program</DialogTitle>
            <DialogDescription>
              Add a new organizational program with custom onboarding stages
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Peer Support Specialist"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the program's purpose and goals"
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={() => setEditingProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>
              Update program information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Program Name *</Label>
              <Input
                id="edit-name"
                value={editingProgram?.name || ""}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingProgram?.description || ""}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, description: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProgram(null)}>
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
