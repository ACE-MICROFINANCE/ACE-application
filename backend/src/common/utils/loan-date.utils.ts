import { isLeapYear, isValid, parse, subDays } from 'date-fns';
import { Prisma } from '@prisma/client';

export type DayCountConvention = 'ACT_365F' | 'ACT_ACT';

const toNumber = (value: unknown): number => {
  if (value instanceof Prisma.Decimal) return Number(value);
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim().replace(/,/g, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseBijliDate = (input: string): Date | null => {
  // CHANGED: parse BIJLI date dd/MM/yyyy using date-fns
  const parsed = parse(input, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

export const getDayBasis = (date: Date, convention: DayCountConvention): number => {
  // CHANGED: day basis for interest calculation
  if (convention === 'ACT_ACT') {
    return isLeapYear(date) ? 366 : 365;
  }
  return 365;
};

type InferDaysParams = {
  principalDisbursed: number | Prisma.Decimal;
  interestFirstPeriod: number | Prisma.Decimal;
  annualRatePct: number;
  dayCountConvention?: DayCountConvention;
  basisDate?: Date;
};

export const inferDaysFromFirstInterest = (params: InferDaysParams): number => {
  // CHANGED: infer days from first-period interest
  const principal = toNumber(params.principalDisbursed);
  const interest = toNumber(params.interestFirstPeriod);
  const ratePct = Number(params.annualRatePct || 0);
  const basisDate = params.basisDate ?? new Date();
  const dayBasis = getDayBasis(basisDate, params.dayCountConvention ?? 'ACT_365F'); // CHANGED: day basis based on date
  if (!principal || !interest || !ratePct) return 0;

  const dailyRate = (ratePct / 100) / dayBasis;
  const daysRaw = interest / (principal * dailyRate);
  return Math.round(daysRaw); // CHANGED: round to nearest day (VND rounding)
};

export const inferDisbursementDate = (firstDueOrPaidDate: Date, days: number): Date => {
  // CHANGED: subtract days using date-fns (handles leap years)
  return subDays(firstDueOrPaidDate, days);
};

// CHANGED: sanity check (manual):
// subDays(parse('01/03/2024', 'dd/MM/yyyy', new Date()), 1) => 29/02/2024
// subDays(parse('01/03/2023', 'dd/MM/yyyy', new Date()), 1) => 28/02/2023
