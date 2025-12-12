import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
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
import { Search, Save, Trash2, Star, Filter } from "lucide-react";
import { toast } from "sonner";

const SEARCH_TYPES = [
  { value: "participants", label: "Participants" },
  { value: "documents", label: "Documents" },
  { value: "jobs", label: "Jobs" },
  { value: "programs", label: "Programs" },
];

export default function AdvancedSearch() {
  // Using sonner toast
  const [searchType, setSearchType] = useState("participants");
  const [query, setQuery] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState("");
  
  const [results, setResults] = useState<any[]>([]);

  const searchMutation = trpc.search.fuzzySearch.useMutation();
  const { data: savedQueries, refetch: refetchSavedQueries } = trpc.search.getSavedQueries.useQuery();
  const saveQueryMutation = trpc.search.saveQuery.useMutation();
  const deleteQueryMutation = trpc.search.deleteSavedQuery.useMutation();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await searchMutation.mutateAsync({
        query,
        type: searchType as any,
      });
      setResults(result.results);
      toast({
        title: "Search Complete",
        description: `Found ${result.results.length} results`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Search failed",
        variant: "destructive",
      });
    }
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this query",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveQueryMutation.mutateAsync({
        name: queryName,
        query,
        type: searchType as any,
      });
      toast({
        title: "Success",
        description: "Query saved successfully",
      });
      setIsSaveDialogOpen(false);
      setQueryName("");
      refetchSavedQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save query",
        variant: "destructive",
      });
    }
  };

  const handleLoadQuery = (savedQuery: any) => {
    setQuery(savedQuery.query);
    setSearchType(savedQuery.type);
    toast({
      title: "Query Loaded",
      description: `Loaded "${savedQuery.name}"`,
    });
  };

  const handleDeleteQuery = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved query?")) return;

    try {
      await deleteQueryMutation.mutateAsync({ id });
      toast({
        title: "Success",
        description: "Query deleted successfully",
      });
      refetchSavedQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete query",
        variant: "destructive",
      });
    }
  };

  const renderResult = (result: any) => {
    switch (searchType) {
      case "participants":
        return (
          <Card key={result.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">
                  {result.firstName} {result.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{result.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stage: {result.pipelineStage}
                </p>
              </div>
              {result.score && (
                <div className="text-sm font-medium">
                  Match: {Math.round(result.score * 100)}%
                </div>
              )}
            </div>
          </Card>
        );
      case "documents":
        return (
          <Card key={result.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.documentType}</h3>
                <p className="text-sm text-muted-foreground">
                  Participant: {result.participantId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {result.status}
                </p>
              </div>
              {result.score && (
                <div className="text-sm font-medium">
                  Match: {Math.round(result.score * 100)}%
                </div>
              )}
            </div>
          </Card>
        );
      case "jobs":
        return (
          <Card key={result.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {result.location}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {result.status}
                </p>
              </div>
              {result.score && (
                <div className="text-sm font-medium">
                  Match: {Math.round(result.score * 100)}%
                </div>
              )}
            </div>
          </Card>
        );
      case "programs":
        return (
          <Card key={result.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {result.durationWeeks} weeks
                </p>
              </div>
              {result.score && (
                <div className="text-sm font-medium">
                  Match: {Math.round(result.score * 100)}%
                </div>
              )}
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Advanced Search</h1>
        <p className="text-muted-foreground">
          Fuzzy search across participants, documents, jobs, and programs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search Type
                </label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Search Query
                </label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter search terms..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                  <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fuzzy search will find close matches even with typos
                </p>
              </div>

              <div className="flex gap-2">
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Query
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Search Query</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Query Name
                        </label>
                        <Input
                          value={queryName}
                          onChange={(e) => setQueryName(e.target.value)}
                          placeholder="e.g., Active participants with missing documents"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsSaveDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveQuery}
                          disabled={saveQueryMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-4">
              Search Results ({results.length})
            </h2>
            <div className="space-y-3">
              {results.length === 0 ? (
                <Card className="p-12 text-center">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results yet</h3>
                  <p className="text-muted-foreground">
                    Enter a search query and click Search to find results
                  </p>
                </Card>
              ) : (
                results.map(renderResult)
              )}
            </div>
          </div>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Saved Queries
            </h2>
            <div className="space-y-2">
              {savedQueries?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved queries yet
                </p>
              ) : (
                savedQueries?.map((savedQuery) => (
                  <div
                    key={savedQuery.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadQuery(savedQuery)}
                    >
                      <p className="font-medium text-sm">{savedQuery.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {savedQuery.type}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteQuery(savedQuery.id)}
                      disabled={deleteQueryMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
