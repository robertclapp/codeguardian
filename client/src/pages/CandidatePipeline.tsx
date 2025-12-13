import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Mail, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Candidate {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  stage: string;
  appliedDate: string;
  score?: number;
}

const stages = [
  { id: "applied", title: "Applied", color: "bg-blue-100 text-blue-800" },
  { id: "screening", title: "Screening", color: "bg-yellow-100 text-yellow-800" },
  { id: "interview", title: "Interview", color: "bg-purple-100 text-purple-800" },
  { id: "offer", title: "Offer", color: "bg-green-100 text-green-800" },
  { id: "hired", title: "Hired", color: "bg-emerald-100 text-emerald-800" },
];

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <Card className="mb-3 hover:shadow-md transition-shadow cursor-move">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{candidate.name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {candidate.jobTitle}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{candidate.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{candidate.appliedDate}</span>
              </div>
              {candidate.score && (
                <Badge variant="secondary" className="mt-2">
                  Score: {candidate.score}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({
  stage,
  candidates,
}: {
  stage: { id: string; title: string; color: string };
  candidates: Candidate[];
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{stage.title}</CardTitle>
            <Badge variant="secondary" className={stage.color}>
              {candidates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 min-h-[500px]">
          <SortableContext
            items={candidates.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Candidate Pipeline Kanban Board
 * Drag-and-drop interface for managing candidate hiring stages
 */
export default function CandidatePipeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  // Mock data - replace with tRPC query
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      jobTitle: "Software Engineer",
      stage: "applied",
      appliedDate: "Dec 10, 2025",
      score: 85,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      jobTitle: "Product Manager",
      stage: "screening",
      appliedDate: "Dec 11, 2025",
      score: 92,
    },
    {
      id: 3,
      name: "Mike Brown",
      email: "mike.b@example.com",
      jobTitle: "Software Engineer",
      stage: "interview",
      appliedDate: "Dec 8, 2025",
      score: 78,
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.d@example.com",
      jobTitle: "UX Designer",
      stage: "offer",
      appliedDate: "Dec 5, 2025",
      score: 95,
    },
    {
      id: 5,
      name: "Alex Wilson",
      email: "alex.w@example.com",
      jobTitle: "Data Analyst",
      stage: "hired",
      appliedDate: "Nov 28, 2025",
      score: 88,
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCandidate = candidates.find((c) => c.id === active.id);
    if (!activeCandidate) return;

    // Find which stage the candidate was dropped into
    const overStage = stages.find((stage) =>
      candidates
        .filter((c) => c.stage === stage.id)
        .some((c) => c.id === over.id)
    );

    if (overStage && activeCandidate.stage !== overStage.id) {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === active.id ? { ...c, stage: overStage.id } : c
        )
      );
      toast.success(
        `${activeCandidate.name} moved to ${overStage.title}`
      );
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Candidate Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Drag and drop candidates between hiring stages
            </p>
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const count = filteredCandidates.filter(
              (c) => c.stage === stage.id
            ).length;
            return (
              <Card key={stage.id}>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">
                    {stage.title}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                candidates={filteredCandidates.filter(
                  (c) => c.stage === stage.id
                )}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCandidate ? (
              <Card className="w-[280px] opacity-90 rotate-3">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {activeCandidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {activeCandidate.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {activeCandidate.jobTitle}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </DashboardLayout>
  );
}
