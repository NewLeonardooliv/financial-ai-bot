import { Elysia } from 'elysia';

interface RateLimitConfig {
  max: number;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  private getKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }
    
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
  }

  isAllowed(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(request);
    const now = Date.now();
    const windowMs = this.config.windowMs;
    
    const current = this.requests.get(key);
    
    if (!current || current.resetTime < now) {
      const resetTime = now + windowMs;
      this.requests.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        remaining: this.config.max - 1,
        resetTime
      };
    }
    
    if (current.count >= this.config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }
    
    current.count++;
    
    return {
      allowed: true,
      remaining: this.config.max - current.count,
      resetTime: current.resetTime
    };
  }
}

const rateLimiter = new RateLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_DURATION || '60000'), // 1 minute
});

export const rateLimitMiddleware = new Elysia({ name: 'rate-limit' })
  .onRequest(({ request, set }) => {
    const result = rateLimiter.isAllowed(request);
    
    set.headers['X-RateLimit-Limit'] = rateLimiter['config'].max.toString();
    set.headers['X-RateLimit-Remaining'] = result.remaining.toString();
    set.headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime / 1000).toString();
    
    if (!result.allowed) {
      set.status = 429;
      set.headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
      
      return {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString()
      };
    }
  });
