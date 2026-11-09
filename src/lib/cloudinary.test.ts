import { describe, expect, it } from 'vitest';
import { cloudSrcset, cloudUrl } from './cloudinary';

const img = { id: 'rio-tellez/galeria/rio/cascada', width: 1000, height: 750 };

describe('cloudinary', () => {
  it('genera URL con formato y calidad automáticos', () => {
    expect(cloudUrl(img, 480, 'auto:good', 'demo')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,c_limit,w_480/rio-tellez/galeria/rio/cascada',
    );
  });

  it('no agranda más que el original', () => {
    expect(cloudUrl(img, 4000, 'auto:best', 'demo')).toContain('w_1000/');
  });

  it('srcset descarta anchos mayores al original', () => {
    const s = cloudSrcset(img, [480, 800, 1600], 'auto:good', 'demo');
    expect(s.srcset.split(', ')).toHaveLength(2);
    expect(s.src).toContain('w_800/');
  });

  it('srcset usa el ancho original si todos son mayores', () => {
    const s = cloudSrcset({ ...img, width: 300 }, [480, 800], 'auto:good', 'demo');
    expect(s.srcset).toContain('w_300/');
  });
});
