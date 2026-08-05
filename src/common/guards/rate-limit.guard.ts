import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: { ttl: number; limit: number }) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();

  constructor(private reflector: Reflector) {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.get<{ ttl: number; limit: number }>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!metadata) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const key = `${ip}:${context.getHandler().name}`;
    const now = Date.now();

    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + metadata.ttl });
      return true;
    }

    if (entry.count >= metadata.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        `Rate limit exceeded. Try again in ${retryAfter} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}
