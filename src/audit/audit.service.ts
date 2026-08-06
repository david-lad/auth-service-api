import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

interface AuditLogEntry {
  actorId?: string;
  action: AuditAction;
  targetId?: string;
  ip?: string;
  details?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          targetId: entry.targetId,
          ip: entry.ip,
          details: entry.details,
        },
      });
    } catch {
      // Audit logging should never crash the app
    }
  }

  async findAll(filters?: { actorId?: string; action?: string; limit?: number }) {
    const where: Record<string, string> = {};
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = filters.action;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
