import { formatClock, formatDate, formatDayLabel, startOfDay } from '../date';

describe('дати українською', () => {
  const thisYear = new Date().getFullYear();

  it('пише день і місяць у родовому відмінку', () => {
    expect(formatDate(new Date(thisYear, 10, 14, 15, 24))).toBe('14 листопада');
    expect(formatDate(new Date(thisYear, 0, 1))).toBe('1 січня');
  });

  it('додає рік для минулих років', () => {
    expect(formatDate(new Date(2024, 2, 8))).toBe('8 березня 2024');
  });

  it('сьогодні та вчора — словами', () => {
    const now = Date.now();
    expect(formatDayLabel(now)).toBe('Сьогодні');
    expect(formatDayLabel(startOfDay(now) - 1)).toBe('Учора');
  });

  it('час з нулями попереду', () => {
    expect(formatClock(new Date(thisYear, 0, 1, 9, 5))).toBe('09:05');
  });
});
