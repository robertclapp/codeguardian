import { describe, it, expect } from "vitest";
import {
  parseCSV,
  generateCSVTemplate,
} from "./services/bulkImport";

describe("Bulk Import Service", () => {
  describe("CSV Template Generation", () => {
    it("should generate valid CSV template", () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain("name,email,phone,programId,jobId,startDate");
      expect(template).toContain("John Doe");
      expect(template).toContain("jane@example.com");
    });

    it("should include example rows", () => {
      const template = generateCSVTemplate();
      const lines = template.split("\n");
      
      expect(lines.length).toBeGreaterThanOrEqual(3); // Header + 2 examples
    });
  });

  describe("CSV Parsing", () => {
    it("should parse valid CSV with all fields", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,555-0100,1,1,2024-01-15
Jane Smith,jane@example.com,555-0101,2,2,2024-01-20`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: "John Doe",
        email: "john@example.com",
        phone: "555-0100",
        programId: 1,
        jobId: 1,
        startDate: "2024-01-15",
      });
      expect(result[1]).toMatchObject({
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-0101",
        programId: 2,
        jobId: 2,
        startDate: "2024-01-20",
      });
    });

    it("should parse CSV with optional fields missing", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,,1,,`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "John Doe",
        email: "john@example.com",
        programId: 1,
      });
      expect(result[0].phone).toBeUndefined();
      expect(result[0].jobId).toBeUndefined();
      expect(result[0].startDate).toBeUndefined();
    });

    it("should handle program_id and job_id with underscores", () => {
      const csv = `name,email,phone,program_id,job_id,start_date
John Doe,john@example.com,555-0100,1,1,2024-01-15`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].programId).toBe(1);
      expect(result[0].jobId).toBe(1);
      expect(result[0].startDate).toBe("2024-01-15");
    });

    it("should skip empty lines", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,555-0100,1,1,2024-01-15

Jane Smith,jane@example.com,555-0101,2,2,2024-01-20`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
    });

    it("should throw error for CSV without required columns", () => {
      const csv = `name,phone
John Doe,555-0100`;

      expect(() => parseCSV(csv)).toThrow("CSV must have columns: name, email, programId");
    });

    it("should throw error for CSV with only header", () => {
      const csv = `name,email,programId`;

      expect(() => parseCSV(csv)).toThrow("CSV must have at least a header row and one data row");
    });

    it("should throw error for empty CSV", () => {
      const csv = ``;

      expect(() => parseCSV(csv)).toThrow("CSV must have at least a header row and one data row");
    });
  });

  describe("Email Validation", () => {
    it("should accept valid email formats", () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "user_name@example-domain.com",
      ];

      const csv = validEmails.map((email, i) => 
        `User ${i},${email},,1,,`
      ).join("\n");

      const fullCsv = `name,email,phone,programId,jobId,startDate\n${csv}`;
      const result = parseCSV(fullCsv);

      expect(result).toHaveLength(validEmails.length);
    });

    it("should parse emails with various formats", () => {
      const csv = `name,email,phone,programId,jobId,startDate
User1,test@domain.com,,1,,
User2,test.user@domain.co.uk,,1,,
User3,test+tag@domain.com,,1,,`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(3);
      expect(result[0].email).toBe("test@domain.com");
      expect(result[1].email).toBe("test.user@domain.co.uk");
      expect(result[2].email).toBe("test+tag@domain.com");
    });
  });

  describe("Data Type Handling", () => {
    it("should parse programId as number", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,,123,,`;

      const result = parseCSV(csv);

      expect(result[0].programId).toBe(123);
      expect(typeof result[0].programId).toBe("number");
    });

    it("should parse jobId as number when provided", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,,1,456,`;

      const result = parseCSV(csv);

      expect(result[0].jobId).toBe(456);
      expect(typeof result[0].jobId).toBe("number");
    });

    it("should handle zero as valid programId", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,,0,,`;

      const result = parseCSV(csv);

      expect(result[0].programId).toBe(0);
    });
  });

  describe("CSV Format Variations", () => {
    it("should handle CSV with spaces in values", () => {
      const csv = `name,email,phone,programId,jobId,startDate
John Doe,john@example.com,555-0100,1,1,2024-01-15`;

      const result = parseCSV(csv);

      expect(result[0].name).toBe("John Doe");
    });

    it("should trim whitespace from headers", () => {
      const csv = `name , email , phone , programId , jobId , startDate
John Doe,john@example.com,555-0100,1,1,2024-01-15`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John Doe");
    });

    it("should trim whitespace from values", () => {
      const csv = `name,email,phone,programId,jobId,startDate
 John Doe , john@example.com , 555-0100 , 1 , 1 , 2024-01-15 `;

      const result = parseCSV(csv);

      expect(result[0].name).toBe("John Doe");
      expect(result[0].email).toBe("john@example.com");
      expect(result[0].phone).toBe("555-0100");
    });
  });

  describe("Large Dataset Handling", () => {
    it("should parse CSV with 100 rows", () => {
      const header = "name,email,phone,programId,jobId,startDate";
      const rows = Array.from({ length: 100 }, (_, i) => 
        `User ${i},user${i}@example.com,555-${String(i).padStart(4, "0")},1,1,2024-01-15`
      );
      const csv = [header, ...rows].join("\n");

      const result = parseCSV(csv);

      expect(result).toHaveLength(100);
      expect(result[0].name).toBe("User 0");
      expect(result[99].name).toBe("User 99");
    });

    it("should parse CSV with 1000 rows efficiently", () => {
      const header = "name,email,phone,programId,jobId,startDate";
      const rows = Array.from({ length: 1000 }, (_, i) => 
        `User ${i},user${i}@example.com,,1,,`
      );
      const csv = [header, ...rows].join("\n");

      const startTime = Date.now();
      const result = parseCSV(csv);
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should parse in less than 1 second
    });
  });

  describe("Edge Cases", () => {
    it("should handle CSV with only required fields", () => {
      const csv = `name,email,programId
John Doe,john@example.com,1`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "John Doe",
        email: "john@example.com",
        programId: 1,
      });
    });

    it("should handle mixed case headers", () => {
      const csv = `Name,Email,Phone,ProgramId,JobId,StartDate
John Doe,john@example.com,555-0100,1,1,2024-01-15`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John Doe");
    });

    it("should handle dates in various formats", () => {
      const csv = `name,email,phone,programId,jobId,startDate
User1,user1@example.com,,1,,2024-01-15
User2,user2@example.com,,1,,01/15/2024
User3,user3@example.com,,1,,15-01-2024`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(3);
      expect(result[0].startDate).toBe("2024-01-15");
      expect(result[1].startDate).toBe("01/15/2024");
      expect(result[2].startDate).toBe("15-01-2024");
    });
  });
});
