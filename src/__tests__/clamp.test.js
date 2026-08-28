import { clamp } from '../utils/clamp';

describe('clamp', () => {
  it('should return the value when it is within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should return min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, -50, 50)).toBe(-50);
  });

  it('should return max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, -50, 50)).toBe(50);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('should handle decimal values', () => {
    expect(clamp(5.5, 0, 10)).toBe(5.5);
    expect(clamp(-0.5, 0, 10)).toBe(0);
    expect(clamp(10.5, 0, 10)).toBe(10);
  });

  it('should handle when min equals max', () => {
    expect(clamp(5, 10, 10)).toBe(10);
    expect(clamp(15, 10, 10)).toBe(10);
    expect(clamp(10, 10, 10)).toBe(10);
  });

  it('should handle zero values', () => {
    expect(clamp(0, -10, 10)).toBe(0);
    expect(clamp(0, 0, 0)).toBe(0);
  });
});
