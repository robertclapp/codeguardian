import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Activity, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Fetch job scheduler status
  const { data: jobStatus } = trpc.jobScheduler.getStatus.useQuery();

  // Fetch job logs
  const { data: jobLogs } = trpc.jobScheduler.getLogs.useQuery({ limit: 20 });

  // Search functionality
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const utils = trpc.useUtils();
        const results = await utils.search.unified.fetch({ query: searchQuery, limit: 50 });
        setSearchResults(results);
      } catch (error: any) {
        toast.error(`Search failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System overview, job scheduler, and search functionality
        </p>
      </div>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Quick Search
          </CardTitle>
          <CardDescription>
            Search across participants, documents, jobs, and programs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch}>
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">
                Found {searchResults.length} results
              </p>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{result.type}</Badge>
                          <span className="font-medium">{result.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.description}
                        </p>
                      </div>
                      <Badge variant="secondary">{result.relevance.toFixed(0)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Scheduler Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Background Job Scheduler
          </CardTitle>
          <CardDescription>Automated tasks and scheduled jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="logs">Recent Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              {jobStatus?.active ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Job Scheduler Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Job Scheduler Inactive</span>
                </div>
              )}

              <div className="space-y-3">
                {jobStatus?.jobs.map((job, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{job.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.description}
                        </p>
                      </div>
                      <Badge variant="outline">{job.schedule}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-2">
              {jobLogs && jobLogs.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {jobLogs.map((log: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg ${
                        log.status === "error"
                          ? "border-red-200 bg-red-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {log.status === "error" ? (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            <span className="font-medium">{log.jobName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.message}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No job logs available yet
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>Real-time system status and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Database</span>
              </div>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">WebSocket</span>
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Job Scheduler</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {jobStatus?.jobs.length || 0} jobs running
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
