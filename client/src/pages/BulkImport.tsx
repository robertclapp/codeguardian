import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function BulkImport() {
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [importResults, setImportResults] = useState<any>(null);

  // Get CSV template
  const { data: template } = trpc.bulkImport.getTemplate.useQuery();

  // Import mutation
  const importMutation = trpc.bulkImport.importParticipants.useMutation({
    onSuccess: (data) => {
      setImportResults(data);
      if (data.successful > 0) {
        toast.success(`Successfully imported ${data.successful} participants`);
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} participants failed to import`);
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvContent) {
      toast.error("Please select a CSV file first");
      return;
    }

    importMutation.mutate({ csvContent });
  };

  const handleDownloadTemplate = () => {
    if (!template) return;

    const blob = new Blob([template.content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = template.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Template downloaded");
  };

  const handleReset = () => {
    setCsvContent("");
    setFileName("");
    setImportResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Participant Import</h1>
        <p className="text-muted-foreground mt-2">
          Import multiple participants at once from a CSV file
        </p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Import Participants</CardTitle>
          <CardDescription>Follow these steps to import participants in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Get the CSV template with the correct format
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Fill in Data</h3>
              <p className="text-sm text-muted-foreground">
                Add participant information to the template
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Upload & Import</h3>
              <p className="text-sm text-muted-foreground">
                Upload your CSV file and review the results
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">Required Fields</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>name</strong>: Participant's full name</li>
              <li>• <strong>email</strong>: Participant's email address (must be unique)</li>
              <li>• <strong>programId</strong>: ID of the program to enroll in</li>
            </ul>
            <h4 className="font-medium mt-3 mb-2">Optional Fields</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>phone</strong>: Phone number</li>
              <li>• <strong>jobId</strong>: Specific job ID (auto-created if omitted)</li>
              <li>• <strong>startDate</strong>: Enrollment date (defaults to today)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>Select a CSV file containing participant data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
                {fileName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {fileName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleImport}
              disabled={!csvContent || importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? "Importing..." : "Import Participants"}
            </Button>

            {importResults && (
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              {importResults.successful} successful, {importResults.failed} failed out of {importResults.total} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Successful</span>
                </div>
                <div className="text-3xl font-bold">{importResults.successful}</div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold">Failed</span>
                </div>
                <div className="text-3xl font-bold">{importResults.failed}</div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Total</span>
                </div>
                <div className="text-3xl font-bold">{importResults.total}</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.results.map((result: any) => (
                    <TableRow key={result.row}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.success ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{result.data?.name || "-"}</TableCell>
                      <TableCell>{result.data?.email || "-"}</TableCell>
                      <TableCell>{result.data?.programId || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {result.success ? (
                          <span className="text-muted-foreground">
                            Participant ID: {result.participantId}
                          </span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
