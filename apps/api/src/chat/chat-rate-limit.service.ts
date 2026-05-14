import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= max then
  local ttl = redis.call('PTTL', key)
  if ttl < 0 then
    redis.call('PEXPIRE', key, window)
    ttl = window
  end
  return {0, count, ttl}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, count + 1, window}
`;

@Injectable()
export class ChatRateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatRateLimitService.name);
  private readonly localSendBurstByUser = new Map<string, number[]>();
  private readonly redisUrl = process.env.REDIS_URL?.trim();
  private readonly redisRequired =
    (process.env.CHAT_RATE_LIMIT_REDIS_REQUIRED ??
      (process.env.NODE_ENV === 'production' ? 'true' : 'false'))
      .trim()
      .toLowerCase() !== 'false';
  private redisClient: RedisClient | null = null;
  private redisConnectPromise: Promise<RedisClient> | null = null;
  private memberSequence = 0;

  async onModuleDestroy() {
    if (!this.redisClient?.isOpen) return;
    await this.redisClient.quit();
  }

  async assertSendAllowed(userId: string) {
    const windowMs = this.positiveNumber(process.env.CHAT_RATE_WINDOW_MS, 30_000);
    const maxMessages = this.positiveNumber(
      process.env.CHAT_RATE_MAX_MESSAGES,
      25,
    );

    if (!this.redisUrl) {
      if (this.redisRequired) {
        throw new ServiceUnavailableException(
          'Redis is required for chat rate limiting',
        );
      }
      this.assertLocalSendAllowed(userId, windowMs, maxMessages);
      return;
    }

    try {
      await this.assertRedisSendAllowed(userId, windowMs, maxMessages);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.redisConnectPromise = null;
      this.redisClient = null;

      if (this.redisRequired) {
        this.logger.error(
          'Redis chat rate limiter unavailable',
          err instanceof Error ? err.stack : String(err),
        );
        throw new ServiceUnavailableException(
          'Chat rate limiter temporarily unavailable',
        );
      }

      this.logger.warn(
        `Redis chat rate limiter unavailable; using local fallback: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.assertLocalSendAllowed(userId, windowMs, maxMessages);
    }
  }

  private positiveNumber(raw: string | undefined, fallback: number) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async getRedisClient() {
    if (this.redisClient?.isOpen) return this.redisClient;
    if (!this.redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }
    if (!this.redisConnectPromise) {
      const client = createClient({ url: this.redisUrl });
      client.on('error', (err) => {
        this.logger.warn(`Redis chat rate limiter error: ${err.message}`);
      });
      this.redisConnectPromise = client.connect().then(() => {
        this.redisClient = client;
        this.logger.log('Redis chat rate limiter connected');
        return client;
      });
    }
    return this.redisConnectPromise;
  }

  private async assertRedisSendAllowed(
    userId: string,
    windowMs: number,
    maxMessages: number,
  ) {
    const client = await this.getRedisClient();
    const now = Date.now();
    const member = `${now}:${process.pid}:${++this.memberSequence}`;
    const result = await client.eval(SLIDING_WINDOW_LUA, {
      keys: [`chat:send-rate:{${userId}}`],
      arguments: [String(now), String(windowMs), String(maxMessages), member],
    });
    const [allowed, count, retryAfterMs] = this.parseRedisResult(result);
    if (allowed === 1) return;

    throw new HttpException(
      {
        message: 'Too many chat messages, retry shortly',
        retryAfterMs,
        limit: maxMessages,
        windowMs,
        count,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private parseRedisResult(result: unknown): [number, number, number] {
    if (!Array.isArray(result) || result.length < 3) {
      throw new Error('Unexpected Redis rate limiter response');
    }
    return [
      Number(result[0] ?? 0),
      Number(result[1] ?? 0),
      Number(result[2] ?? 0),
    ];
  }

  private assertLocalSendAllowed(
    userId: string,
    windowMs: number,
    maxMessages: number,
  ) {
    const now = Date.now();
    const existing = this.localSendBurstByUser.get(userId) ?? [];
    const fresh = existing.filter((ts) => now - ts <= windowMs);
    if (fresh.length >= maxMessages) {
      throw new HttpException(
        'Too many chat messages, retry shortly',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    fresh.push(now);
    this.localSendBurstByUser.set(userId, fresh);
  }
}
