import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Play, Edit, Trash2, Plus, Eye } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "getting-started", label: "Getting Started" },
  { value: "document-upload", label: "Document Upload" },
  { value: "progress-tracking", label: "Progress Tracking" },
  { value: "program-completion", label: "Program Completion" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "other", label: "Other" },
];

export default function VideoTutorials() {
  // Using sonner toast
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "getting-started",
    videoUrl: "",
    thumbnailUrl: "",
    duration: 0,
  });

  const { data: tutorials, refetch } = trpc.videoTutorials.getAll.useQuery();
  const createTutorial = trpc.videoTutorials.create.useMutation();
  const deleteTutorial = trpc.videoTutorials.delete.useMutation();
  const incrementView = trpc.videoTutorials.incrementViewCount.useMutation();

  const filteredTutorials = tutorials?.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTutorial.mutateAsync(formData);
      toast({
        title: "Success",
        description: "Video tutorial added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "getting-started",
        videoUrl: "",
        thumbnailUrl: "",
        duration: 0,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add video tutorial",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this video tutorial?")) return;
    
    try {
      await deleteTutorial.mutateAsync({ id });
      toast({
        title: "Success",
        description: "Video tutorial deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video tutorial",
        variant: "destructive",
      });
    }
  };

  const handleWatch = async (tutorial: any) => {
    await incrementView.mutateAsync({ id: tutorial.id });
    window.open(tutorial.videoUrl, "_blank");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Video Tutorials</h1>
          <p className="text-muted-foreground mt-2">
            Manage training videos and onboarding content
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Video Tutorial</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="How to Upload Documents"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="A step-by-step guide to uploading documents..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Video URL
                </label>
                <Input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  placeholder="https://youtube.com/watch?v=... or S3 URL"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube, Vimeo, or direct video file URL
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Thumbnail URL (optional)
                </label>
                <Input
                  type="url"
                  value={formData.thumbnailUrl || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, thumbnailUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="180"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTutorial.isPending}>
                  {createTutorial.isPending ? "Adding..." : "Add Video"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTutorials?.map((tutorial) => (
          <Card key={tutorial.id} className="overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {tutorial.thumbnailUrl ? (
                <img
                  src={tutorial.thumbnailUrl}
                  alt={tutorial.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                {formatDuration(tutorial.duration || 0)}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">{tutorial.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {tutorial.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span className="capitalize">
                  {tutorial.category.replace("-", " ")}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {tutorial.viewCount} views
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleWatch(tutorial)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Watch
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(tutorial.id)}
                  disabled={deleteTutorial.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTutorials?.length === 0 && (
        <Card className="p-12 text-center">
          <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first video tutorial to help users learn the platform
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Video
          </Button>
        </Card>
      )}
    </div>
  );
}
