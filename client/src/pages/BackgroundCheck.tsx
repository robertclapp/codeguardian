import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, DollarSign, CheckCircle } from "lucide-react";

export default function BackgroundCheck() {
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

  const { data: packages } = trpc.backgroundCheck.getAvailablePackages.useQuery();
  const { data: stats } = trpc.backgroundCheck.getCheckStats.useQuery();
  const { data: candidates } = trpc.candidates.list.useQuery();

  const initiateCheckMutation = trpc.backgroundCheck.initiateCheck.useMutation({
    onSuccess: () => {
      alert("Background check initiated successfully!");
    },
  });

  const handleInitiateCheck = (
    packageId: string,
    packageName: string,
    provider: string,
    price: number
  ) => {
    if (!selectedCandidateId) {
      alert("Please select a candidate first");
      return;
    }

    const consent = confirm(
      "Has the candidate provided written consent for this background check?"
    );
    if (!consent) return;

    initiateCheckMutation.mutate({
      candidateId: selectedCandidateId,
      packageId,
      packageName,
      provider,
      price,
      consentGiven: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Background Checks</h1>
        <p className="text-muted-foreground mt-2">
          Automated background screening with Checkr and Sterling
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending + stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clear Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clearRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Available Packages</CardTitle>
          <CardDescription>Select a background check package for candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages?.map((pkg) => (
              <Card key={pkg.id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Shield className="w-8 h-8 text-primary" />
                    <Badge variant="outline">{pkg.provider}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{pkg.name}</CardTitle>
                  <CardDescription className="text-xs">{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">${pkg.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{pkg.turnaroundTime}</span>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-xs font-semibold">Includes:</p>
                    {pkg.includes.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleInitiateCheck(pkg.id, pkg.name, pkg.provider, pkg.price)}
                    disabled={!selectedCandidateId || initiateCheckMutation.isPending}
                  >
                    Initiate Check
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
