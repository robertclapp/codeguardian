/**
 * CSV Data Migration Service
 * Handles bulk import of candidates and jobs from external systems
 */

import Papa from 'papaparse';

export interface CSVField {
  name: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'boolean';
  required: boolean;
  example?: string;
}

export interface FieldMapping {
  csvColumn: string;
  targetField: string;
  transform?: (value: any) => any;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ValidationError[];
  rollbackId?: string;
}

/**
 * Candidate CSV Schema
 */
export const CANDIDATE_FIELDS: CSVField[] = [
  { name: 'firstName', type: 'string', required: true },
  { name: 'lastName', type: 'string', required: true },
  { name: 'email', type: 'email', required: true },
  { name: 'phone', type: 'phone', required: false },
  { name: 'dateOfBirth', type: 'date', required: false },
  { name: 'address', type: 'string', required: false },
  { name: 'city', type: 'string', required: false },
  { name: 'state', type: 'string', required: false },
  { name: 'zipCode', type: 'string', required: false },
  { name: 'education', type: 'string', required: false },
  { name: 'experience', type: 'string', required: false },
  { name: 'skills', type: 'string', required: false },
  { name: 'status', type: 'string', required: false },
];

/**
 * Job CSV Schema
 */
export const JOB_FIELDS: CSVField[] = [
  { name: 'title', type: 'string', required: true },
  { name: 'description', type: 'string', required: true },
  { name: 'location', type: 'string', required: true },
  { name: 'employmentType', type: 'string', required: true },
  { name: 'salaryMin', type: 'number', required: false },
  { name: 'salaryMax', type: 'number', required: false },
  { name: 'requirements', type: 'string', required: false },
  { name: 'benefits', type: 'string', required: false },
  { name: 'deadline', type: 'date', required: false },
  { name: 'status', type: 'string', required: false },
];

export class CSVMigrationService {
  /**
   * Parse CSV file and detect columns
   */
  static parseCSV(fileContent: string): { headers: string[]; rows: any[] } {
    const result = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    return {
      headers: result.meta.fields || [],
      rows: result.data,
    };
  }

  /**
   * Validate field mapping
   */
  static validateMapping(
    mapping: FieldMapping[],
    targetFields: CSVField[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const mappedFields = new Set(mapping.map((m) => m.targetField));

    // Check required fields are mapped
    for (const field of targetFields) {
      if (field.required && !mappedFields.has(field.name)) {
        errors.push(`Required field "${field.name}" is not mapped`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate data row
   */
  static validateRow(
    row: any,
    mapping: FieldMapping[],
    targetFields: CSVField[],
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const map of mapping) {
      const field = targetFields.find((f) => f.name === map.targetField);
      if (!field) continue;

      const value = row[map.csvColumn];

      // Check required
      if (field.required && (!value || value.toString().trim() === '')) {
        errors.push({
          row: rowNumber,
          field: map.targetField,
          value,
          error: 'Required field is empty',
        });
        continue;
      }

      // Type validation
      if (value && value.toString().trim() !== '') {
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push({
                row: rowNumber,
                field: map.targetField,
                value,
                error: 'Invalid email format',
              });
            }
            break;
          case 'phone':
            if (!/^\+?[\d\s\-()]+$/.test(value)) {
              errors.push({
                row: rowNumber,
                field: map.targetField,
                value,
                error: 'Invalid phone format',
              });
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push({
                row: rowNumber,
                field: map.targetField,
                value,
                error: 'Must be a number',
              });
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push({
                row: rowNumber,
                field: map.targetField,
                value,
                error: 'Invalid date format',
              });
            }
            break;
        }
      }
    }

    return errors;
  }

  /**
   * Transform row data according to mapping
   */
  static transformRow(row: any, mapping: FieldMapping[]): any {
    const transformed: any = {};

    for (const map of mapping) {
      let value = row[map.csvColumn];

      // Apply transform if provided
      if (map.transform) {
        value = map.transform(value);
      }

      transformed[map.targetField] = value;
    }

    return transformed;
  }

  /**
   * Preview import (validate without importing)
   */
  static previewImport(
    fileContent: string,
    mapping: FieldMapping[],
    targetFields: CSVField[],
    maxRows: number = 10
  ): {
    preview: any[];
    errors: ValidationError[];
    totalRows: number;
  } {
    const { rows } = this.parseCSV(fileContent);
    const preview: any[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
      const rowErrors = this.validateRow(rows[i], mapping, targetFields, i + 1);
      errors.push(...rowErrors);

      if (rowErrors.length === 0) {
        preview.push(this.transformRow(rows[i], mapping));
      }
    }

    return {
      preview,
      errors,
      totalRows: rows.length,
    };
  }
}
