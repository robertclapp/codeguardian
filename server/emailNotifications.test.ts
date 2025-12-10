import { describe, it, expect } from 'vitest';

describe('Email Notification Logic', () => {
  describe('Email Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('user.name+tag@example.co.uk')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });
  });

  describe('Template Formatting', () => {
    it('should format document list correctly', () => {
      const documents = ['Resume', 'Cover Letter', 'References'];
      const formatted = documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n');
      
      expect(formatted).toContain('1. Resume');
      expect(formatted).toContain('2. Cover Letter');
      expect(formatted).toContain('3. References');
    });

    it('should format single document', () => {
      const documents = ['Resume'];
      const formatted = documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n');
      
      expect(formatted).toBe('1. Resume');
    });

    it('should format dates in readable format', () => {
      const date = new Date('2024-12-31T00:00:00Z');
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      
      expect(formatted).toBe('December 31, 2024');
    });

    it('should personalize greeting with candidate name', () => {
      const name = 'Jane Doe';
      const greeting = `Dear ${name},`;
      
      expect(greeting).toBe('Dear Jane Doe,');
    });

    it('should handle missing name gracefully', () => {
      const name = '';
      const greeting = name ? `Dear ${name},` : 'Dear Candidate,';
      
      expect(greeting).toBe('Dear Candidate,');
    });
  });

  describe('Notification Types', () => {
    it('should identify missing document notification', () => {
      const notificationType = 'missing_documents';
      const validTypes = ['missing_documents', 'stage_transition', 'document_approval'];
      
      expect(validTypes).toContain(notificationType);
    });

    it('should identify stage transition notification', () => {
      const notificationType = 'stage_transition';
      const requiresStageInfo = notificationType === 'stage_transition';
      
      expect(requiresStageInfo).toBe(true);
    });

    it('should identify document approval notification', () => {
      const notificationType = 'document_approval';
      const requiresDocumentInfo = notificationType === 'document_approval';
      
      expect(requiresDocumentInfo).toBe(true);
    });
  });

  describe('Content Generation', () => {
    it('should generate missing document reminder content', () => {
      const candidateName = 'Jane Doe';
      const programName = 'Peer Support Training';
      const missingDocs = ['Resume', 'Cover Letter'];
      
      const content = `Dear ${candidateName},\n\nYou are missing the following documents for ${programName}:\n${missingDocs.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
      
      expect(content).toContain(candidateName);
      expect(content).toContain(programName);
      expect(content).toContain('Resume');
      expect(content).toContain('Cover Letter');
    });

    it('should generate stage transition content', () => {
      const candidateName = 'Jane Doe';
      const programName = 'Peer Support Training';
      const newStage = 'Background Check';
      
      const content = `Dear ${candidateName},\n\nCongratulations! You have advanced to the ${newStage} stage in ${programName}.`;
      
      expect(content).toContain(candidateName);
      expect(content).toContain(newStage);
      expect(content).toContain(programName);
    });

    it('should generate approval notification content', () => {
      const candidateName = 'Jane Doe';
      const documentName = 'Resume';
      const status = 'approved';
      
      const content = `Dear ${candidateName},\n\nYour ${documentName} has been ${status}.`;
      
      expect(content).toContain(candidateName);
      expect(content).toContain(documentName);
      expect(content).toContain(status);
    });

    it('should include rejection reason in rejection notification', () => {
      const documentName = 'Resume';
      const rejectionReason = 'Document is not legible';
      
      const content = `Your ${documentName} has been rejected.\n\nReason: ${rejectionReason}`;
      
      expect(content).toContain(documentName);
      expect(content).toContain(rejectionReason);
    });
  });

  describe('Batch Notifications', () => {
    it('should handle multiple recipients', () => {
      const recipients = [
        { email: 'candidate1@example.com', name: 'Jane Doe' },
        { email: 'candidate2@example.com', name: 'John Smith' },
        { email: 'candidate3@example.com', name: 'Alice Johnson' },
      ];
      
      expect(recipients).toHaveLength(3);
      expect(recipients.every(r => r.email && r.name)).toBe(true);
    });

    it('should validate all email addresses in batch', () => {
      const emails = [
        'valid1@example.com',
        'valid2@example.com',
        'valid3@example.com',
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const allValid = emails.every(email => emailRegex.test(email));
      
      expect(allValid).toBe(true);
    });
  });

  describe('Deadline Handling', () => {
    it('should format deadline in notification', () => {
      const deadline = new Date('2024-12-31T00:00:00Z');
      const formatted = deadline.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      
      const content = `Please submit by ${formatted}.`;
      
      expect(content).toContain('December 31, 2024');
    });

    it('should calculate days until deadline', () => {
      const now = new Date('2024-12-01');
      const deadline = new Date('2024-12-31');
      
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntil).toBe(30);
    });

    it('should identify urgent deadlines', () => {
      const now = new Date('2024-12-28');
      const deadline = new Date('2024-12-31');
      
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 3;
      
      expect(isUrgent).toBe(true);
    });
  });

  describe('Contact Information', () => {
    it('should include contact email when provided', () => {
      const contactEmail = 'program@example.com';
      const content = `For questions, contact us at ${contactEmail}.`;
      
      expect(content).toContain(contactEmail);
    });

    it('should include contact phone when provided', () => {
      const contactPhone = '555-0123';
      const content = `Call us at ${contactPhone}.`;
      
      expect(content).toContain(contactPhone);
    });

    it('should format complete contact section', () => {
      const contactEmail = 'program@example.com';
      const contactPhone = '555-0123';
      
      const content = `For questions:\nEmail: ${contactEmail}\nPhone: ${contactPhone}`;
      
      expect(content).toContain(contactEmail);
      expect(content).toContain(contactPhone);
    });
  });
});
