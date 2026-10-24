import { describe, expect, it } from 'vitest';
import { clampTravelers, estimateTotal, formatCop } from './price';

describe('formatCop', () => {
  it('usa punto de miles y sufijo COP', () => {
    expect(formatCop(50000)).toBe('$50.000 COP');
    expect(formatCop(400000)).toBe('$400.000 COP');
    expect(formatCop(1250000)).toBe('$1.250.000 COP');
  });

  it('redondea decimales', () => {
    expect(formatCop(49999.6)).toBe('$50.000 COP');
  });
});

describe('clampTravelers', () => {
  it('respeta el rango 1–8', () => {
    expect(clampTravelers(0, 1, 8)).toBe(1);
    expect(clampTravelers(9, 1, 8)).toBe(8);
    expect(clampTravelers(3, 1, 8)).toBe(3);
  });

  it('maneja valores inválidos', () => {
    expect(clampTravelers(Number.NaN, 1, 8)).toBe(1);
    expect(clampTravelers(2.7, 1, 8)).toBe(2);
  });
});

describe('estimateTotal', () => {
  it('multiplica precio por personas', () => {
    expect(estimateTotal(50000, 2)).toBe(100000);
    expect(estimateTotal(50000, 8)).toBe(400000);
  });

  it('devuelve 0 con valores inválidos', () => {
    expect(estimateTotal(Number.NaN, 2)).toBe(0);
    expect(estimateTotal(50000, -1)).toBe(0);
  });
});
