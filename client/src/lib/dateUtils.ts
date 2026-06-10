const IST_TIMEZONE = 'Asia/Kolkata';

export function getISTDateString(date?: Date): string {
  return (date || new Date()).toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
}

export function getISTYear(): number {
  return parseInt(new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE }).split('-')[0]);
}

export function getISTNow(): Date {
  const str = getISTDateString();
  return new Date(str + 'T00:00:00');
}

export function getISTYesterdayString(): string {
  const now = getISTNow();
  now.setDate(now.getDate() - 1);
  return getISTDateString(now);
}

export function getStartOfWeekIST(): Date {
  const today = getISTNow();
  const day = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  today.setDate(today.getDate() - daysFromMonday);
  return today;
}

export function getStartOfMonthIST(): Date {
  const str = getISTDateString();
  const [year, month] = str.split('-').map(Number);
  return new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`);
}

export function getStartOfYearIST(): Date {
  const year = getISTYear();
  return new Date(`${year}-01-01T00:00:00`);
}

export function getISTWeekdayShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    timeZone: IST_TIMEZONE,
  });
}
