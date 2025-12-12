import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function DataMigration() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [importType, setImportType] = useState<"candidates" | "jobs">("candidates");
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "complete">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ csvColumn: string; targetField: string }[]>([]);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: targetFields } = trpc.csvMigration.getTargetFields.useQuery({ type: importType });
  const parseCSVMutation = trpc.csvMigration.parseCSV.useMutation();
  const previewMutation = trpc.csvMigration.previewImport.useMutation();
  const executeMutation = trpc.csvMigration.executeImport.useMutation();
  const { data: history } = trpc.csvMigration.getImportHistory.useQuery();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const content = await uploadedFile.text();
    setFileContent(content);

    // Parse CSV
    const result = await parseCSVMutation.mutateAsync({ fileContent: content });
    setCsvHeaders(result.headers);
    setStep("mapping");
  };

  const handlePreview = async () => {
    const result = await previewMutation.mutateAsync({
      fileContent,
      type: importType,
      mapping,
    });
    setPreviewResult(result);
    setStep("preview");
  };

  const handleExecute = async () => {
    if (!file) return;

    await executeMutation.mutateAsync({
      fileContent,
      fileName: file.name,
      type: importType,
      mapping,
    });
    setStep("complete");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Migration</h1>
        <p className="text-muted-foreground mt-2">
          Import candidates and jobs from CSV files
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select a CSV file to import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={importType === "candidates" ? "default" : "outline"}
                onClick={() => setImportType("candidates")}
              >
                Import Candidates
              </Button>
              <Button
                variant={importType === "jobs" ? "default" : "outline"}
                onClick={() => setImportType("jobs")}
              >
                Import Jobs
              </Button>
            </div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button as="span">Choose CSV File</Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Field Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Fields</CardTitle>
            <CardDescription>Match CSV columns to target fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {targetFields?.filter((f) => f.required).map((field) => (
              <div key={field.name} className="flex items-center gap-4">
                <div className="w-1/3 font-medium">{field.name} *</div>
                <select
                  className="w-2/3 p-2 border rounded"
                  onChange={(e) => {
                    const newMapping = mapping.filter((m) => m.targetField !== field.name);
                    if (e.target.value) {
                      newMapping.push({ csvColumn: e.target.value, targetField: field.name });
                    }
                    setMapping(newMapping);
                  }}
                >
                  <option value="">Select column...</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex gap-4">
              <Button onClick={() => setStep("upload")} variant="outline">
                Back
              </Button>
              <Button onClick={handlePreview} disabled={mapping.length === 0}>
                Preview Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && previewResult && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>
              {previewResult.totalRows} rows found, {previewResult.errors.length} errors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewResult.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Validation Errors:</h3>
                {previewResult.errors.slice(0, 5).map((err: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    Row {err.row}, Field {err.field}: {err.error}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <Button onClick={() => setStep("mapping")} variant="outline">
                Back
              </Button>
              <Button onClick={handleExecute} disabled={previewResult.errors.length > 0}>
                Execute Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle />
              <span>Data imported successfully!</span>
            </div>
            <Button onClick={() => setStep("upload")} className="mt-4">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history?.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{item.fileName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.successfulRows} success, {item.failedRows} failed
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
