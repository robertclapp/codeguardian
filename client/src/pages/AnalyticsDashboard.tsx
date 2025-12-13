import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { Download, Calendar, TrendingUp, Users, Clock, Target } from "lucide-react";
import { toast } from "sonner";

// Mock data
const timeToHireData = [
  { month: "Jul", days: 32 },
  { month: "Aug", days: 28 },
  { month: "Sep", days: 35 },
  { month: "Oct", days: 30 },
  { month: "Nov", days: 25 },
  { month: "Dec", days: 27 },
];

const sourceEffectivenessData = [
  { source: "LinkedIn", applications: 145, hires: 12 },
  { source: "Indeed", applications: 98, hires: 8 },
  { source: "Referrals", applications: 56, hires: 15 },
  { source: "Company Website", applications: 78, hires: 6 },
  { source: "Job Boards", applications: 34, hires: 3 },
];

const diversityData = [
  { name: "Male", value: 58, color: "#3b82f6" },
  { name: "Female", value: 38, color: "#ec4899" },
  { name: "Non-binary", value: 4, color: "#8b5cf6" },
];

const funnelData = [
  { stage: "Applied", value: 500, fill: "#3b82f6" },
  { stage: "Screening", value: 250, fill: "#8b5cf6" },
  { stage: "Interview", value: 100, fill: "#ec4899" },
  { stage: "Offer", value: 30, fill: "#f59e0b" },
  { stage: "Hired", value: 20, fill: "#10b981" },
];

/**
 * Analytics Dashboard
 * Comprehensive analytics and metrics for hiring process
 */
export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("last_6_months");

  const handleExportPDF = () => {
    toast.success("Exporting report to PDF...");
    // TODO: Implement PDF export
  };

  const handleExportExcel = () => {
    toast.success("Exporting data to Excel...");
    // TODO: Implement Excel export
  };

  const conversionRate = ((20 / 500) * 100).toFixed(1);
  const avgTimeToHire = Math.round(
    timeToHireData.reduce((sum, d) => sum + d.days, 0) / timeToHireData.length
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analytics and insights for your hiring process
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="date-range" className="whitespace-nowrap">
                Date Range:
              </Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {dateRange === "custom" && (
                <>
                  <Input type="date" className="w-[150px]" />
                  <span>to</span>
                  <Input type="date" className="w-[150px]" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Avg. Time to Hire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTimeToHire} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                -3 days from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                +1.2% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Applicants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">500</div>
              <p className="text-xs text-muted-foreground mt-1">
                +45 from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Total Hires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">20</div>
              <p className="text-xs text-muted-foreground mt-1">
                +5 from last period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time to Hire Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Hire Trend</CardTitle>
            <CardDescription>
              Average days from application to hire over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeToHireData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="days"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Days to Hire"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle>Source Effectiveness</CardTitle>
            <CardDescription>
              Applications and hires by recruitment source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceEffectivenessData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="applications" fill="#3b82f6" name="Applications" />
                <Bar dataKey="hires" fill="#10b981" name="Hires" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diversity Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Diversity Metrics</CardTitle>
              <CardDescription>
                Gender distribution of hired candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={diversityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {diversityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funnel Conversion */}
          <Card>
            <CardHeader>
              <CardTitle>Hiring Funnel</CardTitle>
              <CardDescription>
                Candidate progression through hiring stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData}>
                    <LabelList
                      position="right"
                      fill="#000"
                      stroke="none"
                      dataKey="stage"
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Source Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Source Performance Details</CardTitle>
            <CardDescription>
              Detailed breakdown of recruitment source effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Source</th>
                    <th className="text-right p-2">Applications</th>
                    <th className="text-right p-2">Hires</th>
                    <th className="text-right p-2">Conversion Rate</th>
                    <th className="text-right p-2">Cost per Hire</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceEffectivenessData.map((source) => {
                    const rate = ((source.hires / source.applications) * 100).toFixed(1);
                    return (
                      <tr key={source.source} className="border-b">
                        <td className="p-2 font-medium">{source.source}</td>
                        <td className="text-right p-2">{source.applications}</td>
                        <td className="text-right p-2">{source.hires}</td>
                        <td className="text-right p-2">{rate}%</td>
                        <td className="text-right p-2">
                          ${Math.round(Math.random() * 2000 + 500)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
