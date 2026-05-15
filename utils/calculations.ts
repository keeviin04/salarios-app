// ============================================================================
// CÁLCULO SALARIAL - implementa secciones 8, 11 y 12 del documento funcional.
// ============================================================================

import type {
  Attendance,
  EconomicRecord,
  GlobalConfig,
  MonthlySummary,
  Worker,
} from "@/types";

const DEFAULT_CONFIG: GlobalConfig = {
  extraHourPrice: 10,
  fullDayHours: 9,
};

// ---------------------------------------------------------------------------
// Sección 8: Pago de un día concreto
// ---------------------------------------------------------------------------

export interface DayPaymentBreakdown {
  dailyPay: number;
  extraPay: number;
  total: number;
}

/**
 * Cálculo del pago de un trabajador para un día concreto.
 *
 * Reglas:
 *   - Jornada completa = config.fullDayHours (por defecto 9).
 *   - Si trabaja >= jornada completa, cobra salario diario completo.
 *   - Si trabaja menos, cobra proporcionalmente:
 *       pago = (salarioDiario / jornadaCompleta) × horasTrabajadas
 *   - Horas extra se pagan a config.extraHourPrice (por defecto 10 €).
 *   - Total del día = pago día + pago horas extra.
 */
export function calculateDayPayment(
  hoursWorked: number,
  extraHours: number,
  dailySalary: number,
  config: GlobalConfig = DEFAULT_CONFIG
): DayPaymentBreakdown {
  const hours = Math.max(0, hoursWorked);
  const extra = Math.max(0, extraHours);
  const fullDay = config.fullDayHours > 0 ? config.fullDayHours : 9;

  const dailyPay =
    hours >= fullDay ? dailySalary : (dailySalary / fullDay) * hours;
  const extraPay = config.extraHourPrice * extra;

  return {
    dailyPay: round2(dailyPay),
    extraPay: round2(extraPay),
    total: round2(dailyPay + extraPay),
  };
}

// ---------------------------------------------------------------------------
// Sección 11: Resumen mensual por trabajador
// ---------------------------------------------------------------------------

/**
 * Resumen mensual de un trabajador.
 *   Total generado = pago días + pago horas extra
 *   Saldo final    = total generado - adelantos + pagos de adelanto - sueldos pagados
 *
 * Además aplica la lógica de la sección 12 si el trabajador cobra por banco.
 */
export function buildMonthlySummary(
  worker: Worker,
  year: number,
  month: number,
  attendances: Attendance[],
  economicRecords: EconomicRecord[],
  config: GlobalConfig = DEFAULT_CONFIG
): MonthlySummary {
  const monthAttendances = attendances.filter(
    (a) => a.workerId === worker.id && isInMonth(a.date, year, month)
  );
  const monthRecords = economicRecords.filter(
    (r) => r.workerId === worker.id && isInMonth(r.date, year, month)
  );

  let daysWorked = 0;
  let hoursWorked = 0;
  let extraHours = 0;
  let dailyPay = 0;
  let extraPay = 0;

  // Agrupar por fecha: varias obras el mismo día = 1 día trabajado.
  // Las horas se suman antes de calcular el pago para que la jornada
  // completa (>= fullDayHours) se evalúe sobre el total del día.
  const byDate = new Map<string, Attendance[]>();
  for (const a of monthAttendances) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  for (const dayAtts of byDate.values()) {
    daysWorked += 1;
    const dayHours = dayAtts.reduce((s, a) => s + a.hoursWorked, 0);
    const dayExtra = dayAtts.reduce((s, a) => s + a.extraHours, 0);
    hoursWorked += dayHours;
    extraHours += dayExtra;
    const pay = calculateDayPayment(dayHours, dayExtra, worker.dailySalary, config);
    dailyPay += pay.dailyPay;
    extraPay += pay.extraPay;
  }

  const advances = sumByType(monthRecords, "adelanto");
  const advancePayments = sumByType(monthRecords, "pago_adelanto");
  const salariesPaid = sumByType(monthRecords, "sueldo");

  const totalGenerated = dailyPay + extraPay;
  const finalBalance =
    totalGenerated - advances + advancePayments - salariesPaid;

  const summary: MonthlySummary = {
    workerId: worker.id,
    year,
    month,
    daysWorked,
    hoursWorked: round2(hoursWorked),
    extraHours: round2(extraHours),
    dailyPay: round2(dailyPay),
    extraPay: round2(extraPay),
    totalGenerated: round2(totalGenerated),
    advances: round2(advances),
    advancePayments: round2(advancePayments),
    salariesPaid: round2(salariesPaid),
    finalBalance: round2(finalBalance),
  };

  // Sección 12: si cobra por banco
  if (worker.paymentMethod === "banco" && worker.bankAmount != null) {
    const bank = resolveBankPayment(totalGenerated, worker.bankAmount);
    summary.bankAmount = bank.bankAmount;
    summary.cashDifference = bank.cashDifference;
    summary.pendingDebt = bank.pendingDebt;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Sección 12: Trabajadores que cobran por banco
// ---------------------------------------------------------------------------

export interface BankPaymentResult {
  bankAmount: number;
  cashDifference: number; // > 0 → pagar en efectivo
  pendingDebt: number; // > 0 → deuda para el mes siguiente
}

/**
 * Si el total generado es mayor que el ingreso bancario,
 * se paga la diferencia en efectivo.
 * Si es menor, se genera una deuda para el mes siguiente.
 */
export function resolveBankPayment(
  totalGenerated: number,
  bankAmount: number
): BankPaymentResult {
  const diff = totalGenerated - bankAmount;
  return {
    bankAmount: round2(bankAmount),
    cashDifference: diff > 0 ? round2(diff) : 0,
    pendingDebt: diff < 0 ? round2(-diff) : 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function isInMonth(iso: string, year: number, month: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function sumByType(
  records: EconomicRecord[],
  type: EconomicRecord["type"]
): number {
  return records
    .filter((r) => r.type === type)
    .reduce((acc, r) => acc + r.amount, 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
