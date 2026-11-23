// Дати українською: «14 листопада», «14 листопада 2025», «Сьогодні», «Учора»

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

const DAY_MS = 86400000;

// Початок доби (00:00 за місцевим часом) — ключ для групування за днями
export const startOfDay = (value: Date | number) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

// «14 листопада»; рік додаємо лише для минулих років
export const formatDate = (value: Date | number) => {
  const date = new Date(value);
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear() ? label : `${label} ${date.getFullYear()}`;
};

// «Сьогодні», «Учора» або дата
export const formatDayLabel = (value: Date | number) => {
  const daysAgo = Math.round((startOfDay(Date.now()) - startOfDay(value)) / DAY_MS);
  if (daysAgo === 0) return 'Сьогодні';
  if (daysAgo === 1) return 'Учора';
  return formatDate(value);
};

// «09:05»
export const formatClock = (value: Date | number) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
