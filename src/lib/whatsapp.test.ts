import { describe, expect, it } from 'vitest';
import {
  buildBookingMessage,
  buildCoffeeOrderMessage,
  buildWhatsAppUrl,
  formatIsoDate,
  formatTime12h,
} from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('limpia el número y codifica el texto', () => {
    expect(buildWhatsAppUrl('+57 320 680 7016')).toBe('https://wa.me/573206807016');
    expect(buildWhatsAppUrl('573206807016', 'Hola & más\nlínea')).toBe(
      'https://wa.me/573206807016?text=Hola%20%26%20m%C3%A1s%0Al%C3%ADnea',
    );
  });
});

describe('formatTime12h', () => {
  it('convierte a 12 horas', () => {
    expect(formatTime12h('06:30')).toBe('06:30 AM');
    expect(formatTime12h('13:30')).toBe('01:30 PM');
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('00:15')).toBe('12:15 AM');
  });

  it('deja intacto un valor inválido', () => {
    expect(formatTime12h('mañana')).toBe('mañana');
  });
});

describe('formatIsoDate', () => {
  it('formatea sin correr el día por zona horaria', () => {
    expect(formatIsoDate('2026-11-15', 'es')).toBe('domingo, 15 de noviembre de 2026');
    expect(formatIsoDate('2026-11-15', 'en')).toBe('Sunday, November 15, 2026');
  });
});

describe('buildBookingMessage', () => {
  const data = {
    experience: 'Caminatas Ecológicas & Cascadas',
    date: '2026-11-15',
    time: '06:30',
    travelers: 2,
    name: '  Mariana Gómez ',
    totalCop: 100000,
  };

  it('arma el mensaje en español', () => {
    expect(buildBookingMessage('es', data)).toBe(
      [
        'Hola, quiero reservar una experiencia en Río Téllez 🌿',
        '• Experiencia: Caminatas Ecológicas & Cascadas',
        '• Fecha: domingo, 15 de noviembre de 2026',
        '• Horario: 06:30 AM',
        '• Personas: 2',
        '• Nombre: Mariana Gómez',
        '• Total estimado: $100.000 COP',
      ].join('\n'),
    );
  });

  it('arma el mensaje en inglés', () => {
    const msg = buildBookingMessage('en', { ...data, experience: 'Eco Hikes & Waterfalls' });
    expect(msg).toContain('Hello, I would like to book');
    expect(msg).toContain('• Experience: Eco Hikes & Waterfalls');
    expect(msg).toContain('• Date: Sunday, November 15, 2026');
    expect(msg).toContain('• People: 2');
  });
});

describe('buildCoffeeOrderMessage', () => {
  it('menciona café de altura en ambos idiomas', () => {
    expect(buildCoffeeOrderMessage('es')).toContain('café de altura');
    expect(buildCoffeeOrderMessage('en')).toContain('high-altitude');
  });
});
