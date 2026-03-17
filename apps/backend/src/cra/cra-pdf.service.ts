import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CraStatus, DocumentType } from '@prisma/client';
import { CraEntryType, PortionType, LeaveType } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CraPdfGenerator } from '@esn/pdf-generator';
import type { CraPdfData } from '@esn/pdf-generator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCraEntryType(value: string): CraEntryType {
  return value as CraEntryType;
}

function toPortionType(value: string | null | undefined): PortionType | null {
  if (value == null) return null;
  return value as PortionType;
}

function toLeaveType(value: string): LeaveType {
  return value as LeaveType;
}

function toNumber(value: number | { toNumber: () => number }): number {
  return typeof value === 'object' ? value.toNumber() : value;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CraPdfService {
  private readonly generator = new CraPdfGenerator();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Generate a PDF for the given CRA month, upload it to S3/MinIO,
   * then transition the CraMonth to LOCKED status.
   *
   * Precondition: craMonth.status must be SIGNED_CLIENT.
   */
  async generateAndUpload(craMonthId: string): Promise<void> {
    // 1. Load CraMonth with all required relations
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { id: craMonthId },
      include: {
        mission: {
          include: {
            employee: true,
            esnAdmin: true,
            client: true,
          },
        },
        entries: {
          include: {
            projectEntries: {
              include: {
                project: true,
              },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (craMonth === null) {
      throw new NotFoundException(`CRA month ${craMonthId} not found`);
    }

    if (craMonth.status !== CraStatus.SIGNED_CLIENT) {
      throw new BadRequestException(
        `CRA month must be in SIGNED_CLIENT status to generate PDF, got ${craMonth.status}`,
      );
    }

    const { mission } = craMonth;
    const employee = mission.employee;
    const esnAdmin = mission.esnAdmin;
    const clientUser = mission.client;

    // 2. Fetch leave balances for the employee for this year
    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: { userId: craMonth.employeeId, year: craMonth.year },
    });

    // 3. Compute summary from entries
    const entries = craMonth.entries;
    let totalWorkDays = 0;
    let totalLeaveDays = 0;
    let totalSickDays = 0;

    for (const entry of entries) {
      const fraction = toNumber(entry.dayFraction);
      const type = toCraEntryType(entry.entryType as string);
      if (
        type === CraEntryType.WORK_ONSITE ||
        type === CraEntryType.WORK_REMOTE ||
        type === CraEntryType.WORK_TRAVEL ||
        type === CraEntryType.TRAINING ||
        type === CraEntryType.ASTREINTE ||
        type === CraEntryType.OVERTIME
      ) {
        totalWorkDays += fraction;
      } else if (
        type === CraEntryType.LEAVE_CP ||
        type === CraEntryType.LEAVE_RTT ||
        type === CraEntryType.HOLIDAY
      ) {
        totalLeaveDays += fraction;
      } else if (type === CraEntryType.SICK) {
        totalSickDays += fraction;
      }
    }

    // Compute working days in month (Mon-Fri count)
    const workingDaysInMonth = countWeekdaysInMonth(craMonth.year, craMonth.month);
    const isOvertime = totalWorkDays > workingDaysInMonth;

    // 4. Build project summary (aggregate days per project)
    const projectDaysMap = new Map<string, { name: string; days: number }>();
    for (const entry of entries) {
      const fraction = toNumber(entry.dayFraction);
      for (const pe of entry.projectEntries) {
        const projectId = pe.project.id;
        const existing = projectDaysMap.get(projectId);
        if (existing != null) {
          existing.days += fraction;
        } else {
          projectDaysMap.set(projectId, { name: pe.project.name, days: fraction });
        }
      }
    }

    const projectsSummary =
      projectDaysMap.size > 0
        ? Array.from(projectDaysMap.values()).map((p) => ({
            name: p.name,
            daysSpent: p.days,
          }))
        : null;

    // 5. Build CraPdfData
    const pdfData: CraPdfData = {
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
      },
      mission: {
        title: mission.title,
        startDate: mission.startDate,
        endDate: mission.endDate,
      },
      client:
        clientUser != null
          ? { firstName: clientUser.firstName, lastName: clientUser.lastName }
          : null,
      year: craMonth.year,
      month: craMonth.month,
      entries: entries.map((entry) => ({
        date: entry.date,
        entryType: toCraEntryType(entry.entryType as string),
        dayFraction: toNumber(entry.dayFraction),
        comment: entry.comment,
        projects: entry.projectEntries.map((pe) => ({
          name: pe.project.name,
          portion: toPortionType(pe.portion as string | null),
        })),
      })),
      summary: {
        totalWorkDays,
        totalLeaveDays,
        totalSickDays,
        workingDaysInMonth,
        isOvertime,
        leaveBalances: leaveBalances.map((lb) => ({
          leaveType: toLeaveType(lb.leaveType as string),
          totalDays: toNumber(lb.totalDays),
          usedDays: toNumber(lb.usedDays),
        })),
      },
      projectsSummary,
      signatures: {
        employee: {
          signedAt: craMonth.signedByEmployeeAt,
          name: `${employee.firstName} ${employee.lastName}`,
        },
        esn: {
          signedAt: craMonth.signedByEsnAt,
          name:
            esnAdmin != null
              ? `${esnAdmin.firstName} ${esnAdmin.lastName}`
              : 'ESN',
        },
        client:
          clientUser != null
            ? {
                signedAt: craMonth.signedByClientAt,
                name: `${clientUser.firstName} ${clientUser.lastName}`,
              }
            : null,
      },
    };

    // 6. Generate PDF buffer
    const pdfBuffer = await this.generator.generate(pdfData);

    // 7. Upload to storage
    const monthPadded = String(craMonth.month).padStart(2, '0');
    const s3Key = `cra/${craMonth.employeeId}/${craMonth.year}/${monthPadded}/cra-${craMonthId}.pdf`;
    await this.storage.uploadFile(pdfBuffer, s3Key, 'application/pdf', pdfBuffer.length);
    const pdfUrl = s3Key;

    const now = new Date();

    // 8. Create Document record (type CRA_PDF) and link to CraMonth via ValidationDocument
    const document = await this.prisma.document.create({
      data: {
        name: `CRA-${craMonth.year}-${String(craMonth.month).padStart(2, '0')}`,
        type: DocumentType.CRA_PDF,
        s3Key: pdfUrl,
        mimeType: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        ownerId: craMonth.employeeId,
        missionId: craMonth.missionId,
        versions: {
          create: {
            s3Key: pdfUrl,
            sizeBytes: pdfBuffer.length,
            version: 1,
            uploadedById: craMonth.employeeId,
          },
        },
      },
    });

    await this.prisma.validationDocument.create({
      data: {
        documentId: document.id,
        craMonthId,
        signedAt: now,
      },
    });

    // 9. Update CraMonth: pdfUrl, status → LOCKED, lockedAt
    await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        pdfUrl,
        status: CraStatus.LOCKED,
        lockedAt: now,
      },
    });

    // 10. Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_LOCKED',
        resource: `cra_month:${craMonthId}`,
        initiatorId: craMonth.employeeId,
      },
    });
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Count the number of weekdays (Mon-Fri) in a given month.
 */
function countWeekdaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
