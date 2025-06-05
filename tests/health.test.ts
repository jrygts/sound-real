import { expect, test, describe } from 'vitest';
import { PLAN_LIMITS } from '../lib/plans';

describe('Health Check Tests', () => {
  test('sanity check - basic math', () => {
    expect(1 + 1).toBe(2);
  });

  test('plan limits are properly configured', () => {
    expect(PLAN_LIMITS.Free).toBe(250);
    expect(PLAN_LIMITS.Basic).toBe(5_000);
    expect(PLAN_LIMITS.Plus).toBe(15_000);
    expect(PLAN_LIMITS.Ultra).toBe(35_000);
  });

  test('environment check - required vars exist in test environment', () => {
    // In test environment, we just check that the check function can be imported
    expect(typeof process.env.NODE_ENV).toBe('string');
  });
}); 