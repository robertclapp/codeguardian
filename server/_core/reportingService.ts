import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedDate: Date;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'metrics' | 'table' | 'text';
  data: any;
}

export interface MetricData {
  label: string;
  value: string | number;
  change?: string;
}

/**
 * Generate PDF report
 */
export function generatePDFReport(reportData: ReportData): Buffer {
  const doc = new jsPDF();
  let yPosition = 20;

  // Add title
  doc.setFontSize(20);
  doc.text(reportData.title, 20, yPosition);
  yPosition += 10;

  // Add subtitle
  if (reportData.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(reportData.subtitle, 20, yPosition);
    yPosition += 8;
  }

  // Add generated date
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(
    `Generated: ${reportData.generatedDate.toLocaleDateString()}`,
    20,
    yPosition
  );
  yPosition += 15;

  // Add sections
  for (const section of reportData.sections) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Section title
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(section.title, 20, yPosition);
    yPosition += 8;

    if (section.type === 'metrics') {
      // Render metrics as a grid
      const metrics = section.data as MetricData[];
      const metricsPerRow = 3;
      const metricWidth = 50;
      const metricHeight = 20;

      metrics.forEach((metric, index) => {
        const row = Math.floor(index / metricsPerRow);
        const col = index % metricsPerRow;
        const x = 20 + col * metricWidth;
        const y = yPosition + row * metricHeight;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(metric.label, x, y);

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(String(metric.value), x, y + 6);

        if (metric.change) {
          doc.setFontSize(8);
          doc.setTextColor(metric.change.startsWith('+') ? 34 : 220, 100, 100);
          doc.text(metric.change, x, y + 12);
        }
      });

      yPosition += Math.ceil(metrics.length / metricsPerRow) * metricHeight + 10;
    } else if (section.type === 'table') {
      // Render table
      const tableData = section.data;
      if (tableData.headers && tableData.rows) {
        autoTable(doc, {
          startY: yPosition,
          head: [tableData.headers],
          body: tableData.rows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    } else if (section.type === 'text') {
      // Render text
      doc.setFontSize(10);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(section.data, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 5 + 10;
    }
  }

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate Excel report
 */
export function generateExcelReport(reportData: ReportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create summary sheet
  const summaryData: any[] = [];
  summaryData.push([reportData.title]);
  if (reportData.subtitle) {
    summaryData.push([reportData.subtitle]);
  }
  summaryData.push([`Generated: ${reportData.generatedDate.toLocaleDateString()}`]);
  summaryData.push([]); // Empty row

  // Add sections to summary or separate sheets
  reportData.sections.forEach((section, index) => {
    if (section.type === 'metrics') {
      summaryData.push([section.title]);
      const metrics = section.data as MetricData[];
      metrics.forEach((metric) => {
        summaryData.push([
          metric.label,
          metric.value,
          metric.change || '',
        ]);
      });
      summaryData.push([]); // Empty row
    } else if (section.type === 'table') {
      // Create separate sheet for tables
      const tableData = section.data;
      if (tableData.headers && tableData.rows) {
        const sheetData = [tableData.headers, ...tableData.rows];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          section.title.substring(0, 31) // Excel sheet name limit
        );
      }
    } else if (section.type === 'text') {
      summaryData.push([section.title]);
      summaryData.push([section.data]);
      summaryData.push([]); // Empty row
    }
  });

  // Add summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return Buffer.from(excelBuffer);
}

/**
 * Generate grant application report
 */
export function generateGrantReport(data: {
  organizationName: string;
  reportingPeriod: string;
  totalParticipants: number;
  placementRate: number;
  completionRate: number;
  demographics: any[];
  programOutcomes: any[];
}): ReportData {
  return {
    title: 'Grant Application Report',
    subtitle: `${data.organizationName} - ${data.reportingPeriod}`,
    generatedDate: new Date(),
    sections: [
      {
        title: 'Key Metrics',
        type: 'metrics',
        data: [
          {
            label: 'Total Participants',
            value: data.totalParticipants,
          },
          {
            label: 'Placement Rate',
            value: `${data.placementRate}%`,
            change: data.placementRate > 70 ? '+Above Target' : 'Below Target',
          },
          {
            label: 'Program Completion',
            value: `${data.completionRate}%`,
            change: data.completionRate > 80 ? '+Above Target' : 'Below Target',
          },
        ],
      },
      {
        title: 'Demographics',
        type: 'table',
        data: {
          headers: ['Category', 'Count', 'Percentage'],
          rows: data.demographics,
        },
      },
      {
        title: 'Program Outcomes',
        type: 'table',
        data: {
          headers: ['Outcome', 'Participants', 'Success Rate'],
          rows: data.programOutcomes,
        },
      },
    ],
  };
}

/**
 * Generate stakeholder presentation report
 */
export function generateStakeholderReport(data: {
  organizationName: string;
  quarter: string;
  highlights: string[];
  metrics: MetricData[];
  successStories: any[];
}): ReportData {
  return {
    title: 'Stakeholder Presentation',
    subtitle: `${data.organizationName} - ${data.quarter}`,
    generatedDate: new Date(),
    sections: [
      {
        title: 'Highlights',
        type: 'text',
        data: data.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n'),
      },
      {
        title: 'Performance Metrics',
        type: 'metrics',
        data: data.metrics,
      },
      {
        title: 'Success Stories',
        type: 'table',
        data: {
          headers: ['Participant', 'Program', 'Outcome'],
          rows: data.successStories,
        },
      },
    ],
  };
}
