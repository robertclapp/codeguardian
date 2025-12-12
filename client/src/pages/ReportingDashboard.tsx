import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileSpreadsheet, Calendar } from "lucide-react";

export default function ReportingDashboard() {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [organizationName, setOrganizationName] = useState("My Organization");
  const [reportingPeriod, setReportingPeriod] = useState("Q1 2024");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch templates
  const { data: templates } = trpc.reporting.getTemplates.useQuery();

  // Generate PDF mutation
  const generateGrantPDFMutation = trpc.reporting.generateGrantPDF.useMutation({
    onSuccess: (result) => {
      // Download PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.data}`;
      link.download = result.filename;
      link.click();
    },
  });

  // Generate Excel mutation
  const generateGrantExcelMutation = trpc.reporting.generateGrantExcel.useMutation({
    onSuccess: (result) => {
      // Download Excel
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
      link.download = result.filename;
      link.click();
    },
  });

  // Generate stakeholder PDF mutation
  const generateStakeholderPDFMutation = trpc.reporting.generateStakeholderPDF.useMutation({
    onSuccess: (result) => {
      // Download PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.data}`;
      link.download = result.filename;
      link.click();
    },
  });

  const handleGenerateReport = (format: "PDF" | "Excel") => {
    if (!selectedTemplate || !startDate || !endDate) {
      alert("Please fill in all required fields");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (selectedTemplate === "grant") {
      if (format === "PDF") {
        generateGrantPDFMutation.mutate({
          organizationName,
          reportingPeriod,
          startDate: start,
          endDate: end,
        });
      } else {
        generateGrantExcelMutation.mutate({
          organizationName,
          reportingPeriod,
          startDate: start,
          endDate: end,
        });
      }
    } else if (selectedTemplate === "stakeholder") {
      generateStakeholderPDFMutation.mutate({
        organizationName,
        quarter: reportingPeriod,
      });
    }
  };

  const selectedTemplateData = templates?.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reporting Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Generate customizable reports for grant applications and stakeholder presentations
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Report Templates */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Report Templates
            </CardTitle>
            <CardDescription>Choose a report template to generate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex gap-1">
                    {template.formats.map((format) => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>
              {selectedTemplateData
                ? `Configure ${selectedTemplateData.name}`
                : "Select a template to begin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a report template from the left to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>

                <div>
                  <Label htmlFor="reportingPeriod">Reporting Period</Label>
                  <Input
                    id="reportingPeriod"
                    value={reportingPeriod}
                    onChange={(e) => setReportingPeriod(e.target.value)}
                    placeholder="e.g., Q1 2024, January-March 2024"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Export Options</h4>
                  <div className="flex gap-2">
                    {selectedTemplateData?.formats.includes("PDF") && (
                      <Button
                        onClick={() => handleGenerateReport("PDF")}
                        disabled={
                          generateGrantPDFMutation.isPending ||
                          generateStakeholderPDFMutation.isPending
                        }
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {generateGrantPDFMutation.isPending ||
                        generateStakeholderPDFMutation.isPending
                          ? "Generating..."
                          : "Download PDF"}
                      </Button>
                    )}
                    {selectedTemplateData?.formats.includes("Excel") && (
                      <Button
                        onClick={() => handleGenerateReport("Excel")}
                        disabled={generateGrantExcelMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {generateGrantExcelMutation.isPending ? "Generating..." : "Download Excel"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Preview of included metrics and sections</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTemplate === "grant" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Included Metrics:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Total Participants</li>
                    <li>Placement Rate</li>
                    <li>Program Completion Rate</li>
                    <li>Demographics Breakdown</li>
                    <li>Program Outcomes</li>
                  </ul>
                </div>
              </div>
            )}
            {selectedTemplate === "stakeholder" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Included Sections:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Quarterly Highlights</li>
                    <li>Performance Metrics</li>
                    <li>Success Stories</li>
                    <li>Growth Trends</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
