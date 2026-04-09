// /lib/payroll/calculatePayroll.ts

export interface PayrollInput {
  grossPayPerPeriod: number;
  payPeriodsPerYear?: number;

  federalClaimAmount?: number;
  quebecClaimAmount?: number;

  additionalFederalTax?: number;
  additionalQuebecTax?: number;

  isExempt?: boolean;

  manual?: {
    federalTax?: number;
    quebecTax?: number;
    qpp?: number;
    ei?: number;
    qpip?: number;
  };
}

export interface PayrollOutput {
  qpp: number;
  ei: number;
  qpip: number;

  federalTax: number;
  quebecTax: number;

  totalDeductions: number;
  netPay: number;

  debug?: {
    annualIncome: number;
    federalClaimAmount: number;
    quebecClaimAmount: number;
    qpp: number;
    ei: number;
    qpip: number;
  };
}

// ================= CONSTANTS =================

const PAY_PERIODS_DEFAULT = 26;

const QC = {
  // Federal brackets (CRA style)
  federalBrackets: [
    { upper: 58523, rate: 0.14, constant: 0 },
    { upper: 117045, rate: 0.205, constant: 3804 },
    { upper: 181440, rate: 0.26, constant: 10241.48 },
    { upper: Infinity, rate: 0.29, constant: 15684.68 },
  ],

  // Quebec brackets with constants
  quebecBrackets: [
    { upper: 54345, rate: 0.14, constant: 0 },
    { upper: 108680, rate: 0.19, constant: 2717 },
    { upper: 132245, rate: 0.24, constant: 8151 },
    { upper: Infinity, rate: 0.2575, constant: 10465 },
  ],

  qppRate: 0.063,
  qppBaseRate: 0.053,
  qppExemptionAnnual: 3500,

  eiRate: 0.013,
  eiMaxAnnual: 1002, // cap added

  qpipRate: 0.0043,

  federalLowestRate: 0.14,
  abatementRate: 0.165,

  employmentMax: 1501,

  defaultFederalClaim: 16452,
};

// ================= HELPERS =================

function getFederalBracket(income: number) {
  return QC.federalBrackets.find((b) => income <= b.upper)!;
}

function getQuebecBracket(income: number) {
  return QC.quebecBrackets.find((b) => income <= b.upper)!;
}

// ================= MAIN FUNCTION =================

export function calculatePayroll(input: PayrollInput): PayrollOutput {
  const {
    grossPayPerPeriod,
    payPeriodsPerYear = PAY_PERIODS_DEFAULT,

    federalClaimAmount = QC.defaultFederalClaim,
    quebecClaimAmount = 18952,

    additionalFederalTax = 0,
    additionalQuebecTax = 0,

    isExempt = false,
    manual = {},
  } = input;

  // ================= CONTRIBUTIONS =================

  const qppExemption = QC.qppExemptionAnnual / payPeriodsPerYear;

  const calculatedQpp = Math.max(
    0,
    (grossPayPerPeriod - qppExemption) * QC.qppRate
  );

  const qpp = manual.qpp ?? calculatedQpp;

  // EI with cap
  const eiAnnualRaw =
    grossPayPerPeriod * payPeriodsPerYear * QC.eiRate;

  const eiAnnual = Math.min(eiAnnualRaw, QC.eiMaxAnnual);

  const ei = manual.ei ?? eiAnnual / payPeriodsPerYear;

  const qpip = manual.qpip ?? grossPayPerPeriod * QC.qpipRate;

  // ================= EXEMPT =================

  if (isExempt) {
    const total = qpp + ei + qpip;

    return {
      qpp,
      ei,
      qpip,
      federalTax: 0,
      quebecTax: 0,
      totalDeductions: total,
      netPay: grossPayPerPeriod - total,
    };
  }

  // ================= ANNUALIZE =================

  const annualIncome = grossPayPerPeriod * payPeriodsPerYear;

  // ================= FEDERAL =================

  let federalTax = manual.federalTax;

  if (federalTax === undefined) {
    const bracket = getFederalBracket(annualIncome);

    const baseTax = annualIncome * bracket.rate - bracket.constant;

    // Credits
    const qppCreditAnnual =
      (qpp * (QC.qppBaseRate / QC.qppRate)) * payPeriodsPerYear;

    const eiAnnualVal = ei * payPeriodsPerYear;
    const qpipAnnual = qpip * payPeriodsPerYear;

    const employment = Math.min(
      QC.employmentMax,
      annualIncome
    );

    const credits =
      federalClaimAmount +
      qppCreditAnnual +
      eiAnnualVal +
      qpipAnnual +
      employment;

    const creditValue = credits * QC.federalLowestRate;

    const afterCredits = Math.max(0, baseTax - creditValue);

    const abatement = afterCredits * QC.abatementRate;

    const netFederalAnnual = afterCredits - abatement;

    federalTax =
      netFederalAnnual / payPeriodsPerYear + additionalFederalTax;
  }

  // ================= QUEBEC =================

  let quebecTax = manual.quebecTax;

if (quebecTax === undefined) {
  const bracket = getQuebecBracket(annualIncome);

  const baseTax =
    annualIncome * bracket.rate - bracket.constant;

  // Annual contributions
  const qppAnnual = qpp * payPeriodsPerYear;
  const eiAnnual = ei * payPeriodsPerYear;
  const qpipAnnual = qpip * payPeriodsPerYear;

  // Total credits
  const totalCredits =
    18952 +
    qppAnnual +
    eiAnnual +
    qpipAnnual;

  const creditValue = totalCredits * 0.14;

  const annualTax = Math.max(0, baseTax - creditValue);

  quebecTax =
    annualTax / payPeriodsPerYear + additionalQuebecTax;
}
  // ================= TOTAL =================

  const totalDeductions =
    qpp + ei + qpip + federalTax + quebecTax;

  return {
    qpp,
    ei,
    qpip,
    federalTax,
    quebecTax,
    totalDeductions,
    netPay: grossPayPerPeriod - totalDeductions,

    debug: {
      annualIncome,
      federalClaimAmount,
      quebecClaimAmount,
      qpp,
      ei,
      qpip,
    },
  };
}

// ================= SMALL EXPORTS =================

export function calculateQPP(gross: number, periods = 26) {
  const exemption = 3500 / periods;
  return Math.max(0, (gross - exemption) * 0.063);
}

export function calculateEI(gross: number) {
  return gross * 0.013;
}

export function calculateQPIP(gross: number) {
  return gross * 0.0043;
}
