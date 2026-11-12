export interface DailyTraffic { day: string; visitors: number; pageviews: number }
export interface CountryTraffic { code: string; visitors: number; pageviews: number }
export interface AnalyticsReport {
  timezone: 'UTC';
  generatedAt: string;
  days: number;
  daily: DailyTraffic[];
  countries: CountryTraffic[];
}

export function parseReport(value: unknown): AnalyticsReport {
  const report = value as AnalyticsReport | null;
  const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (!report || report.timezone !== 'UTC' || ![1, 7, 30].includes(report.days) ||
    typeof report.generatedAt !== 'string' || !Number.isFinite(Date.parse(report.generatedAt)) ||
    !Array.isArray(report.daily) || report.daily.length !== report.days ||
    !report.daily.every(row => row && /^\d{4}-\d{2}-\d{2}$/.test(row.day) && count(row.visitors) && count(row.pageviews)) ||
    !Array.isArray(report.countries) || !report.countries.every(row => row && /^[A-Z]{2}$/.test(row.code) && count(row.visitors) && count(row.pageviews)))
    throw new Error('Invalid analytics response.');
  return report;
}
