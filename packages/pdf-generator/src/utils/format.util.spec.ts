import { describe, it, expect } from 'vitest';
import { formatDate, formatDecimal, entryTypeLabel, entryTypeColor } from './format.util';
import { CraEntryType } from '@esn/shared-types';

describe('FormatUtil', () => {
  describe('formatDate', () => {
    it('should format a Date to DD/MM/YYYY', () => {
      const date = new Date(2026, 2, 16); // March 16, 2026
      expect(formatDate(date)).toBe('16/03/2026');
    });

    it('should pad single-digit day and month with zeros', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(formatDate(date)).toBe('05/01/2026');
    });
  });

  describe('formatDecimal', () => {
    it('should format decimal 1.0 as "1,0"', () => {
      expect(formatDecimal(1.0)).toBe('1,0');
    });

    it('should format decimal 0.5 as "0,5"', () => {
      expect(formatDecimal(0.5)).toBe('0,5');
    });

    it('should format decimal 0.25 with French locale comma', () => {
      expect(formatDecimal(0.25)).toBe('0,25');
    });
  });

  describe('entryTypeLabel', () => {
    it('should return French label for WORK_ONSITE', () => {
      expect(entryTypeLabel(CraEntryType.WORK_ONSITE)).toBe('Présentiel');
    });

    it('should return French label for WORK_REMOTE', () => {
      expect(entryTypeLabel(CraEntryType.WORK_REMOTE)).toBe('Télétravail');
    });

    it('should return French label for WORK_TRAVEL', () => {
      expect(entryTypeLabel(CraEntryType.WORK_TRAVEL)).toBe('Déplacement');
    });

    it('should return French label for LEAVE_CP', () => {
      expect(entryTypeLabel(CraEntryType.LEAVE_CP)).toBe('Congé payé');
    });

    it('should return French label for LEAVE_RTT', () => {
      expect(entryTypeLabel(CraEntryType.LEAVE_RTT)).toBe('RTT');
    });

    it('should return French label for SICK', () => {
      expect(entryTypeLabel(CraEntryType.SICK)).toBe('Maladie');
    });

    it('should return French label for HOLIDAY', () => {
      expect(entryTypeLabel(CraEntryType.HOLIDAY)).toBe('Jour férié');
    });

    it('should return French label for TRAINING', () => {
      expect(entryTypeLabel(CraEntryType.TRAINING)).toBe('Formation');
    });

    it('should return French label for ASTREINTE', () => {
      expect(entryTypeLabel(CraEntryType.ASTREINTE)).toBe('Astreinte');
    });

    it('should return French label for OVERTIME', () => {
      expect(entryTypeLabel(CraEntryType.OVERTIME)).toBe('Heures sup.');
    });
  });

  describe('entryTypeColor', () => {
    it('should return correct hex color for WORK_ONSITE', () => {
      expect(entryTypeColor(CraEntryType.WORK_ONSITE)).toBe('#d1fae5');
    });

    it('should return correct hex color for WORK_REMOTE', () => {
      expect(entryTypeColor(CraEntryType.WORK_REMOTE)).toBe('#dbeafe');
    });

    it('should return correct hex color for WORK_TRAVEL', () => {
      expect(entryTypeColor(CraEntryType.WORK_TRAVEL)).toBe('#ede9fe');
    });

    it('should return correct hex color for LEAVE_CP', () => {
      expect(entryTypeColor(CraEntryType.LEAVE_CP)).toBe('#fef9c3');
    });

    it('should return correct hex color for LEAVE_RTT', () => {
      expect(entryTypeColor(CraEntryType.LEAVE_RTT)).toBe('#fef3c7');
    });

    it('should return correct hex color for SICK', () => {
      expect(entryTypeColor(CraEntryType.SICK)).toBe('#fee2e2');
    });

    it('should return correct hex color for HOLIDAY', () => {
      expect(entryTypeColor(CraEntryType.HOLIDAY)).toBe('#f3f4f6');
    });

    it('should return correct hex color for TRAINING', () => {
      expect(entryTypeColor(CraEntryType.TRAINING)).toBe('#f0fdf4');
    });

    it('should return correct hex color for ASTREINTE', () => {
      expect(entryTypeColor(CraEntryType.ASTREINTE)).toBe('#fff7ed');
    });

    it('should return correct hex color for OVERTIME', () => {
      expect(entryTypeColor(CraEntryType.OVERTIME)).toBe('#fdf4ff');
    });
  });
});
