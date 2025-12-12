import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Award, Send } from "lucide-react";

export default function SkillsAssessment() {
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

  const { data: assessments } = trpc.skillsAssessment.getAvailableAssessments.useQuery();
  const { data: stats } = trpc.skillsAssessment.getAssessmentStats.useQuery();
  const { data: candidates } = trpc.candidates.list.useQuery();

  const sendInvitationMutation = trpc.skillsAssessment.sendInvitation.useMutation({
    onSuccess: () => {
      alert("Assessment invitation sent successfully!");
    },
  });

  const handleSendInvitation = (assessmentId: string, title: string, provider: string) => {
    if (!selectedCandidateId) {
      alert("Please select a candidate first");
      return;
    }

    sendInvitationMutation.mutate({
      candidateId: selectedCandidateId,
      assessmentId,
      assessmentTitle: title,
      provider,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Skills Assessment</h1>
        <p className="text-muted-foreground mt-2">
          Validate candidate competencies with third-party skills testing platforms
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">{stats.completionRate}% completion rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Available Assessments</CardTitle>
          <CardDescription>Send assessment invitations to candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments?.map((assessment) => (
              <Card key={assessment.id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Brain className="w-8 h-8 text-primary" />
                    <Badge variant="outline">{assessment.provider}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{assessment.title}</CardTitle>
                  <CardDescription className="text-xs">{assessment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{assessment.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <Badge variant="secondary" className="text-xs">
                        {assessment.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => handleSendInvitation(assessment.id, assessment.title, assessment.provider)}
                    disabled={!selectedCandidateId || sendInvitationMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
