import { describe, it, expect } from 'vitest';
import { Role, CraStatus, WeatherState, LeaveType, DocumentType, ConsentStatus, ValidationStatus } from '@prisma/client';

/**
 * Schema enum validation tests — verifies that the generated Prisma client
 * exports the expected enum values, ensuring the migration and schema are in sync.
 */
describe('Prisma Schema — Enum values', () => {
  describe('Role', () => {
    it('exports EMPLOYEE, ESN_ADMIN, CLIENT', () => {
      expect(Role.EMPLOYEE).toBe('EMPLOYEE');
      expect(Role.ESN_ADMIN).toBe('ESN_ADMIN');
      expect(Role.CLIENT).toBe('CLIENT');
    });
  });

  describe('CraStatus', () => {
    it('exports full workflow statuses', () => {
      expect(CraStatus.DRAFT).toBe('DRAFT');
      expect(CraStatus.SUBMITTED).toBe('SUBMITTED');
      expect(CraStatus.SIGNED_EMPLOYEE).toBe('SIGNED_EMPLOYEE');
      expect(CraStatus.SIGNED_CLIENT).toBe('SIGNED_CLIENT');
      expect(CraStatus.LOCKED).toBe('LOCKED');
    });
  });

  describe('WeatherState', () => {
    it('exports SUNNY, CLOUDY, RAINY, STORM, VALIDATION_PENDING, VALIDATED', () => {
      expect(WeatherState.SUNNY).toBe('SUNNY');
      expect(WeatherState.CLOUDY).toBe('CLOUDY');
      expect(WeatherState.RAINY).toBe('RAINY');
      expect(WeatherState.STORM).toBe('STORM');
      expect(WeatherState.VALIDATION_PENDING).toBe('VALIDATION_PENDING');
      expect(WeatherState.VALIDATED).toBe('VALIDATED');
    });
  });

  describe('LeaveType', () => {
    it('exports all leave types', () => {
      expect(LeaveType.PAID_LEAVE).toBe('PAID_LEAVE');
      expect(LeaveType.RTT).toBe('RTT');
      expect(LeaveType.SICK_LEAVE).toBe('SICK_LEAVE');
      expect(LeaveType.OTHER).toBe('OTHER');
    });
  });

  describe('DocumentType', () => {
    it('exports all document types', () => {
      expect(DocumentType.CRA_PDF).toBe('CRA_PDF');
      expect(DocumentType.CONTRACT).toBe('CONTRACT');
      expect(DocumentType.AMENDMENT).toBe('AMENDMENT');
      expect(DocumentType.MISSION_ORDER).toBe('MISSION_ORDER');
      expect(DocumentType.OTHER).toBe('OTHER');
    });
  });

  describe('ConsentStatus', () => {
    it('exports PENDING, GRANTED, REVOKED', () => {
      expect(ConsentStatus.PENDING).toBe('PENDING');
      expect(ConsentStatus.GRANTED).toBe('GRANTED');
      expect(ConsentStatus.REVOKED).toBe('REVOKED');
    });
  });

  describe('ValidationStatus', () => {
    it('exports PENDING, APPROVED, REJECTED, ARCHIVED', () => {
      expect(ValidationStatus.PENDING).toBe('PENDING');
      expect(ValidationStatus.APPROVED).toBe('APPROVED');
      expect(ValidationStatus.REJECTED).toBe('REJECTED');
      expect(ValidationStatus.ARCHIVED).toBe('ARCHIVED');
    });
  });
});
