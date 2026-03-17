import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { WeatherService } from '../../../src/projects/weather.service';
import { WeatherState, ProjectStatus } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'employee-uuid-1';
const projectId = 'project-uuid-1';
const missionId = 'mission-uuid-1';

const mockMission = {
  id: missionId,
  employeeId,
  esnAdminId: 'esnadmin-uuid-1',
  clientId: null,
};

const mockProject = {
  id: projectId,
  name: 'Projet Alpha',
  status: ProjectStatus.ACTIVE,
  missionId,
  mission: mockMission,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWeatherEntry = {
  id: 'weather-uuid-1',
  date: new Date('2026-03-10'),
  state: WeatherState.SUNNY,
  comment: null,
  isEscalated: false,
  escalatedAt: null,
  projectId,
  reportedById: employeeId,
  createdAt: new Date(),
};

const mockPrisma = {
  project: {
    findFirst: vi.fn(),
  },
  weatherEntry: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} satisfies Partial<PrismaService> as unknown as PrismaService;

const mockEvents = { emit: vi.fn() } as never;

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WeatherService(mockPrisma, mockEvents);
  });

  describe('createEntry', () => {
    it('should create a SUNNY entry without comment', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);
      vi.mocked(mockPrisma.weatherEntry.create).mockResolvedValue(mockWeatherEntry as never);

      const result = await service.createEntry(projectId, employeeId, {
        date: '2026-03-10',
        state: WeatherState.SUNNY,
      });

      expect(result.state).toBe(WeatherState.SUNNY);
      expect(mockPrisma.weatherEntry.create).toHaveBeenCalledOnce();
    });

    it('should create a RAINY entry with mandatory comment', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);
      const rainyEntry = { ...mockWeatherEntry, state: WeatherState.RAINY, comment: 'Blocage technique' };
      vi.mocked(mockPrisma.weatherEntry.create).mockResolvedValue(rainyEntry as never);

      const result = await service.createEntry(projectId, employeeId, {
        date: '2026-03-10',
        state: WeatherState.RAINY,
        comment: 'Blocage technique',
      });

      expect(result.state).toBe(WeatherState.RAINY);
    });

    it('should throw BadRequestException if state is RAINY and comment is empty', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);

      await expect(
        service.createEntry(projectId, employeeId, {
          date: '2026-03-10',
          state: WeatherState.RAINY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if state is STORM and comment is empty', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);

      await expect(
        service.createEntry(projectId, employeeId, {
          date: '2026-03-10',
          state: WeatherState.STORM,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if caller is not the project employee', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(null);

      await expect(
        service.createEntry(projectId, 'intruder-id', {
          date: '2026-03-10',
          state: WeatherState.SUNNY,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if project is CLOSED', async () => {
      const closedProject = { ...mockProject, status: ProjectStatus.CLOSED };
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(closedProject as never);

      await expect(
        service.createEntry(projectId, employeeId, {
          date: '2026-03-10',
          state: WeatherState.SUNNY,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should write AuditLog WEATHER_UPDATED', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);
      vi.mocked(mockPrisma.weatherEntry.create).mockResolvedValue(mockWeatherEntry as never);

      await service.createEntry(projectId, employeeId, {
        date: '2026-03-10',
        state: WeatherState.SUNNY,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'WEATHER_UPDATED' }),
        }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return last 30 entries ordered by date desc', async () => {
      const entries = Array.from({ length: 30 }, (_, i) => ({
        ...mockWeatherEntry,
        id: `w${i}`,
        date: new Date(`2026-02-${String(i + 1).padStart(2, '0')}`),
      }));
      vi.mocked(mockPrisma.weatherEntry.findMany).mockResolvedValue(entries as never);

      const result = await service.getHistory(projectId);
      expect(result).toHaveLength(30);
      expect(mockPrisma.weatherEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId }),
          take: 30,
          orderBy: { date: 'desc' },
        }),
      );
    });

    it('should filter by month when yearMonth param provided', async () => {
      vi.mocked(mockPrisma.weatherEntry.findMany).mockResolvedValue([]);

      await service.getHistory(projectId, { yearMonth: '2026-03' });

      expect(mockPrisma.weatherEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('getMonthlySummary', () => {
    it('should return dominant weather state (most frequent) for the month', async () => {
      const entries = [
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.CLOUDY },
      ];
      vi.mocked(mockPrisma.weatherEntry.findMany).mockResolvedValue(entries as never);

      const result = await service.getMonthlySummary(projectId, 2026, 3);
      expect(result.dominantState).toBe(WeatherState.SUNNY);
    });

    it('should return STORM if any STORM entry exists in the month', async () => {
      const entries = [
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.STORM },
      ];
      vi.mocked(mockPrisma.weatherEntry.findMany).mockResolvedValue(entries as never);

      const result = await service.getMonthlySummary(projectId, 2026, 3);
      expect(result.dominantState).toBe(WeatherState.STORM);
    });

    it('should return entry count per state', async () => {
      const entries = [
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.SUNNY },
        { ...mockWeatherEntry, state: WeatherState.CLOUDY },
      ];
      vi.mocked(mockPrisma.weatherEntry.findMany).mockResolvedValue(entries as never);

      const result = await service.getMonthlySummary(projectId, 2026, 3);
      expect(result.entryCounts[WeatherState.SUNNY]).toBe(2);
      expect(result.entryCounts[WeatherState.CLOUDY]).toBe(1);
    });
  });
});
