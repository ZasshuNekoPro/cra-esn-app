import { describe, it, expect, beforeAll } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SendReportDto } from './send-report.dto';

describe('SendReportDto — class-validator constraints', () => {
  // ── Valid baseline ──────────────────────────────────────────────────────────

  it('valid DTO passes validation', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('valid DTO with both recipients and CRA_WITH_WEATHER passes', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 6,
      reportType: 'CRA_WITH_WEATHER',
      recipients: ['ESN', 'CLIENT'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ── recipients validation ───────────────────────────────────────────────────

  it('empty recipients array fails (ArrayMinSize(1))', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('recipients');
  });

  it('unknown recipient value fails (IsIn constraint)', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['UNKNOWN'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('recipients');
  });

  it('3 recipients fails (ArrayMaxSize(2))', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN', 'CLIENT', 'ESN'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('recipients');
  });

  // ── month validation ────────────────────────────────────────────────────────

  it('month=0 fails (Min(1))', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 0,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'month')).toBe(true);
  });

  it('month=13 fails (Max(12))', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 13,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'month')).toBe(true);
  });

  it('month=6 passes', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 6,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ── year validation ─────────────────────────────────────────────────────────

  it('year=2019 fails (Min(2020))', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2019,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'year')).toBe(true);
  });

  it('year=2026 passes', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // ── reportType validation ───────────────────────────────────────────────────

  it('invalid reportType fails', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'FULL_REPORT',
      recipients: ['ESN'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reportType')).toBe(true);
  });

  it('CRA_ONLY reportType passes', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['CLIENT'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('CRA_WITH_WEATHER reportType passes', async () => {
    const dto = plainToInstance(SendReportDto, {
      year: 2026,
      month: 3,
      reportType: 'CRA_WITH_WEATHER',
      recipients: ['CLIENT'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
