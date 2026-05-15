import type { Attendance, GlobalConfig, Worker, WorkSite } from "@/types";
import { calculateDayPayment } from "@/utils/calculations";

export const DAY_ABBR = ["D", "L", "M", "X", "J", "V", "S"] as const;

export interface AttendanceDetail {
  attendance: Attendance;
  workSite: WorkSite | undefined;
  dailyPay: number;
  extraPay: number;
  total: number;
}

export interface DayCellData {
  isoDate: string;
  dayNumber: number;
  dayOfWeek: number;
  isSunday: boolean;
  isHoliday: boolean;
  isFuture: boolean;
  attendances: AttendanceDetail[];
  hasAttendance: boolean;
  totalHoursWorked: number;
  totalExtraHours: number;
  totalPay: number;
}

export interface WorkerRowData {
  worker: Worker;
  days: DayCellData[];
  daysWorked: number;
  daysMissed: number;
  totalHoursWorked: number;
  totalExtraHours: number;
  totalGenerated: number;
}

export function getDaysOfMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Uses local date to avoid UTC offset issues with Spanish timezone.
export function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildWorkerRowData(
  worker: Worker,
  days: Date[],
  attendances: Attendance[],
  workSites: WorkSite[],
  config: GlobalConfig,
  holidays: Set<string>,
  todayISO: string
): WorkerRowData {
  const wsMap = new Map(workSites.map((ws) => [ws.id, ws]));

  const attByDate = new Map<string, Attendance[]>();
  for (const a of attendances) {
    if (a.workerId !== worker.id) continue;
    const list = attByDate.get(a.date) ?? [];
    list.push(a);
    attByDate.set(a.date, list);
  }

  let daysWorked = 0;
  let daysMissed = 0;
  let totalHoursWorked = 0;
  let totalExtraHours = 0;
  let totalGenerated = 0;

  const dayCells: DayCellData[] = days.map((d) => {
    const isoDate = dayToISO(d);
    const dayOfWeek = d.getDay();
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidays.has(isoDate);
    const isFuture = isoDate > todayISO;

    const rawAtts = attByDate.get(isoDate) ?? [];
    const hasAttendance = rawAtts.length > 0;

    const dayHours = r2(rawAtts.reduce((s, a) => s + a.hoursWorked, 0));
    const dayExtra = r2(rawAtts.reduce((s, a) => s + a.extraHours, 0));
    // Pago del día = jornada completa evaluada sobre el total de horas del día.
    const dayPay = r2(calculateDayPayment(dayHours, dayExtra, worker.dailySalary, config).total);

    const details: AttendanceDetail[] = rawAtts.map((a) => {
      const pay = calculateDayPayment(a.hoursWorked, a.extraHours, worker.dailySalary, config);
      return {
        attendance: a,
        workSite: wsMap.get(a.workSiteId),
        dailyPay: pay.dailyPay,
        extraPay: pay.extraPay,
        total: pay.total,
      };
    });

    if (hasAttendance) {
      daysWorked++;
      totalHoursWorked += dayHours;
      totalExtraHours += dayExtra;
      totalGenerated += dayPay;
    } else if (!isSunday && !isHoliday && !isFuture) {
      daysMissed++;
    }

    return {
      isoDate,
      dayNumber: d.getDate(),
      dayOfWeek,
      isSunday,
      isHoliday,
      isFuture,
      attendances: details,
      hasAttendance,
      totalHoursWorked: dayHours,
      totalExtraHours: dayExtra,
      totalPay: dayPay,
    };
  });

  return {
    worker,
    days: dayCells,
    daysWorked,
    daysMissed,
    totalHoursWorked: r2(totalHoursWorked),
    totalExtraHours: r2(totalExtraHours),
    totalGenerated: r2(totalGenerated),
  };
}

// ---------------------------------------------------------------------------
// Week utilities
// ---------------------------------------------------------------------------

export interface WeekBounds {
  index: number;
  startDay: number;
  endDay: number;
  isoStart: string;
  isoEnd: string;
}

/** Splits a month's days into calendar weeks (new week starts on Monday). */
export function getWeeksOfMonth(days: Date[]): WeekBounds[] {
  if (days.length === 0) return [];

  const weeks: WeekBounds[] = [];
  let weekStart = days[0];
  let idx = 1;

  for (let i = 1; i < days.length; i++) {
    const d = days[i];
    if (d.getDay() === 1) {
      weeks.push({
        index: idx++,
        startDay: weekStart.getDate(),
        endDay: days[i - 1].getDate(),
        isoStart: dayToISO(weekStart),
        isoEnd: dayToISO(days[i - 1]),
      });
      weekStart = d;
    }
  }
  weeks.push({
    index: idx,
    startDay: weekStart.getDate(),
    endDay: days[days.length - 1].getDate(),
    isoStart: dayToISO(weekStart),
    isoEnd: dayToISO(days[days.length - 1]),
  });

  return weeks;
}

export interface WorkerWeekSlice {
  daysWorked: number;
  daysMissed: number;
  totalHoursWorked: number;
  totalExtraHours: number;
  totalGenerated: number;
}

/** Aggregates a worker's row data for the days within [isoStart, isoEnd]. */
export function sliceWorkerWeek(
  row: WorkerRowData,
  isoStart: string,
  isoEnd: string
): WorkerWeekSlice {
  let daysWorked = 0;
  let daysMissed = 0;
  let totalHoursWorked = 0;
  let totalExtraHours = 0;
  let totalGenerated = 0;

  for (const d of row.days) {
    if (d.isoDate < isoStart || d.isoDate > isoEnd) continue;
    if (d.hasAttendance) {
      daysWorked++;
      totalHoursWorked += d.totalHoursWorked;
      totalExtraHours += d.totalExtraHours;
      totalGenerated += d.totalPay;
    } else if (!d.isSunday && !d.isHoliday && !d.isFuture) {
      daysMissed++;
    }
  }

  return {
    daysWorked,
    daysMissed,
    totalHoursWorked: r2(totalHoursWorked),
    totalExtraHours: r2(totalExtraHours),
    totalGenerated: r2(totalGenerated),
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
