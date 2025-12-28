import {
  generateIdempotencyKey,
  parseMs,
  omit,
  pick,
  sleep,
} from '../../src/shared/utils';

describe('Utils', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = generateIdempotencyKey('user1', 'workspace1', 'CODE_EXECUTION');
      const key2 = generateIdempotencyKey('user1', 'workspace1', 'CODE_EXECUTION');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = generateIdempotencyKey('user1', 'workspace1', 'CODE_EXECUTION');
      const key2 = generateIdempotencyKey('user2', 'workspace1', 'CODE_EXECUTION');
      expect(key1).not.toBe(key2);
    });

    it('should handle complex objects', () => {
      const payload1 = { code: 'console.log(1)' };
      const payload2 = { code: 'console.log(1)' };
      const key1 = generateIdempotencyKey('user1', payload1);
      const key2 = generateIdempotencyKey('user1', payload2);
      expect(key1).toBe(key2);
    });
  });

  describe('parseMs', () => {
    it('should parse milliseconds', () => {
      expect(parseMs('100ms')).toBe(100);
      expect(parseMs('500')).toBe(500);
    });

    it('should parse seconds', () => {
      expect(parseMs('5s')).toBe(5000);
      expect(parseMs('1s')).toBe(1000);
    });

    it('should parse minutes', () => {
      expect(parseMs('15m')).toBe(900000);
      expect(parseMs('1m')).toBe(60000);
    });

    it('should parse hours', () => {
      expect(parseMs('1h')).toBe(3600000);
      expect(parseMs('2h')).toBe(7200000);
    });

    it('should parse days', () => {
      expect(parseMs('1d')).toBe(86400000);
      expect(parseMs('7d')).toBe(604800000);
    });

    it('should return 0 for invalid format', () => {
      expect(parseMs('invalid')).toBe(0);
      expect(parseMs('')).toBe(0);
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });

    it('should omit multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['b', 'd']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should not modify original object', () => {
      const obj = { a: 1, b: 2 };
      omit(obj, ['b']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 } as { a: number; b: number; c?: number };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
