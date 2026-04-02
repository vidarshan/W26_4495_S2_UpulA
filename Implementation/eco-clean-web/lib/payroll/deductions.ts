/**
 * Quebec payroll deductions estimator for 2026.
 *
 * IMPORTANT:
 * - This mirrors the learning workbook logic, not the full official payroll engines.
 * - Use CRA PDOC and Revenu Québec WebRAS / TP-1015.F-V for production payroll.
 *
 * Sources used for the constants in this file:
 * - CRA Quebec payroll deductions guide (2026): EI (QC), federal brackets, Quebec abatement,
 *   federal claim/credit logic.
 * - Revenu Québec 2026 pages: Quebec income tax brackets, QPP limits/rates, QPIP limits/rates.
 */

export interface PayrollInputs {
  grossPayPerPeriod: number;
  payPeriodsPerYear: 52 | 26 | 24 | 12;
  rrspPerPeriod?: number;
  otherPreTaxPerPeriod?: number;
  federalClaimAmountAnnual?: number;
  quebecClaimAmountAnnual?: number;
  ytdPensionableEarnings?: number;
  ytdEiInsurableEarnings?: number;
  ytdQpipInsurableEarnings?: number;
  ytdQppBaseFirstEmployee?: number;
  ytdQpp2Employee?: number;
  ytdEiEmployee?: number;
  ytdQpipEmployee?: number;
  additionalFederalTaxPerPeriod?: number;
  additionalQuebecTaxPerPeriod?: number;
}

export interface PayrollResult {
  qppExemptionPerPeriod: number;
  qppBaseFirstCurrent: number;
  qpp2Current: number;
  eiCurrent: number;
  qpipCurrent: number;
  deductibleRemunerationPerPeriod: number;
  annualTaxableIncome: number;
  annualFederalBaseTax: number;
  annualFederalCreditValue: number;
  annualFederalTaxBeforeAbatement: number;
  quebecFederalAbatement: number;
  federalTaxPerPeriod: number;
  annualQuebecBaseTax: number;
  annualQuebecCreditValue: number;
  quebecTaxPerPeriod: number;
  statutoryDeductionsPerPeriod: number;
  otherDeductionsPerPeriod: number;
  totalDeductionsPerPeriod: number;
  estimatedNetPay: number;
}

export const QC_2026 = {
  federalBrackets: [
    { upper: 58_523, rate: 0.14 },
    { upper: 117_045, rate: 0.205 },
    { upper: 181_440, rate: 0.26 },
    { upper: 258_482, rate: 0.29 },
    { upper: Number.POSITIVE_INFINITY, rate: 0.33 },
  ],
  quebecBrackets: [
    { upper: 54_345, rate: 0.14 },
    { upper: 108_680, rate: 0.19 },
    { upper: 132_245, rate: 0.24 },
    { upper: Number.POSITIVE_INFINITY, rate: 0.2575 },
  ],
  federalLowestCreditRate: 0.14,
  quebecCreditRate: 0.14,
  quebecFederalAbatementRate: 0.165,
  canadaEmploymentAmountMax: 1_501,
  federalDefaultClaim: 16_452,

  qppBasicExemptionAnnual: 3_500,
  qppMaxPensionable: 74_600,
  qppAdditionalMaxPensionable: 85_000,
  qppEmployeeRateBaseFirst: 0.063,
  qppEmployeeMaxBaseFirst: 4_479.3,
  qpp2Rate: 0.04,
  qpp2MaxEmployee: 416,
  qppBaseCreditMaxAnnual: 3_768.3,
  qppBaseCreditFractionOf63: 5.3 / 6.3,

  eiQcMaxInsurable: 68_900,
  eiQcRate: 0.013,
  eiQcMaxEmployee: 895.7,

  qpipMaxInsurable: 103_000,
  qpipRate: 0.0043,
  qpipMaxEmployee: 442.9,
} as const;

function clampMin(value: number, min = 0): number {
  return value < min ? min : value;
}

function progressiveTax(income: number, brackets: ReadonlyArray<{ upper: number; rate: number }>): number {
  let tax = 0;
  let lower = 0;

  for (const bracket of brackets) {
    const slice = Math.max(0, Math.min(income, bracket.upper) - lower);
    tax += slice * bracket.rate;
    if (income <= bracket.upper) break;
    lower = bracket.upper;
  }

  return tax;
}

export function calculateQuebecPayrollEstimate(input: PayrollInputs): PayrollResult {
  const gross = input.grossPayPerPeriod;
  const payPeriods = input.payPeriodsPerYear;
  const rrsp = input.rrspPerPeriod ?? 0;
  const otherPreTax = input.otherPreTaxPerPeriod ?? 0;
  const federalClaim = input.federalClaimAmountAnnual ?? QC_2026.federalDefaultClaim;
  const quebecClaim = input.quebecClaimAmountAnnual ?? 0;
  const ytdPensionable = input.ytdPensionableEarnings ?? 0;
  const ytdEiInsurable = input.ytdEiInsurableEarnings ?? 0;
  const ytdQpipInsurable = input.ytdQpipInsurableEarnings ?? 0;
  const ytdQppBaseFirst = input.ytdQppBaseFirstEmployee ?? 0;
  const ytdQpp2 = input.ytdQpp2Employee ?? 0;
  const ytdEi = input.ytdEiEmployee ?? 0;
  const ytdQpip = input.ytdQpipEmployee ?? 0;
  const addFederal = input.additionalFederalTaxPerPeriod ?? 0;
  const addQuebec = input.additionalQuebecTaxPerPeriod ?? 0;

  const qppExemptionPerPeriod = QC_2026.qppBasicExemptionAnnual / payPeriods;

  const remainingYmpeRoom = clampMin(QC_2026.qppMaxPensionable - ytdPensionable);
  const pensionableUpToYmpeThisPeriod = Math.min(gross, remainingYmpeRoom);
  const qppBaseFirstPreliminary = clampMin(pensionableUpToYmpeThisPeriod - qppExemptionPerPeriod) * QC_2026.qppEmployeeRateBaseFirst;
  const qppBaseFirstCurrent = Math.min(qppBaseFirstPreliminary, clampMin(QC_2026.qppEmployeeMaxBaseFirst - ytdQppBaseFirst));

  const qpp2EarningsThisPeriod = clampMin(
    Math.min(ytdPensionable + gross, QC_2026.qppAdditionalMaxPensionable) - Math.max(ytdPensionable, QC_2026.qppMaxPensionable)
  );
  const qpp2Current = Math.min(qpp2EarningsThisPeriod * QC_2026.qpp2Rate, clampMin(QC_2026.qpp2MaxEmployee - ytdQpp2));

  const remainingEiRoom = clampMin(QC_2026.eiQcMaxInsurable - ytdEiInsurable);
  const eiInsurableThisPeriod = Math.min(gross, remainingEiRoom);
  const eiCurrent = Math.min(eiInsurableThisPeriod * QC_2026.eiQcRate, clampMin(QC_2026.eiQcMaxEmployee - ytdEi));

  const remainingQpipRoom = clampMin(QC_2026.qpipMaxInsurable - ytdQpipInsurable);
  const qpipInsurableThisPeriod = Math.min(gross, remainingQpipRoom);
  const qpipCurrent = Math.min(qpipInsurableThisPeriod * QC_2026.qpipRate, clampMin(QC_2026.qpipMaxEmployee - ytdQpip));

  // CRA example logic: deduct the deductible QPP additional part (1.0 / 6.3 of QPP base+1st)
  // plus QPP2 and RRSP before annualizing taxable income.
  const qppFirstAdditionalDeductiblePart = qppBaseFirstCurrent * (0.01 / 0.063);

  const deductibleRemunerationPerPeriod = clampMin(
    gross - rrsp - otherPreTax - qppFirstAdditionalDeductiblePart - qpp2Current
  );
  const annualTaxableIncome = deductibleRemunerationPerPeriod * payPeriods;

  const annualFederalBaseTax = progressiveTax(annualTaxableIncome, QC_2026.federalBrackets);
  const annualQppBaseCreditAmount = Math.min(
    QC_2026.qppBaseCreditMaxAnnual,
    qppBaseFirstCurrent * payPeriods * QC_2026.qppBaseCreditFractionOf63
  );
  const annualEiCreditAmount = Math.min(QC_2026.eiQcMaxEmployee, eiCurrent * payPeriods);
  const annualQpipCreditAmount = Math.min(QC_2026.qpipMaxEmployee, qpipCurrent * payPeriods);
  const canadaEmploymentAmount = Math.min(QC_2026.canadaEmploymentAmountMax, gross * payPeriods);

  const totalFederalCreditBase =
    federalClaim + annualQppBaseCreditAmount + annualEiCreditAmount + annualQpipCreditAmount + canadaEmploymentAmount;
  const annualFederalCreditValue = totalFederalCreditBase * QC_2026.federalLowestCreditRate;
  const annualFederalTaxBeforeAbatement = Math.max(0, annualFederalBaseTax - annualFederalCreditValue);
  const quebecFederalAbatement = annualFederalTaxBeforeAbatement * QC_2026.quebecFederalAbatementRate;
  const federalTaxPerPeriod = Math.max(0, (annualFederalTaxBeforeAbatement - quebecFederalAbatement) / payPeriods) + addFederal;

  const annualQuebecBaseTax = progressiveTax(annualTaxableIncome, QC_2026.quebecBrackets);
  const annualQuebecCreditValue = quebecClaim * QC_2026.quebecCreditRate;
  const quebecTaxPerPeriod = Math.max(0, (annualQuebecBaseTax - annualQuebecCreditValue) / payPeriods) + addQuebec;

  const statutoryDeductionsPerPeriod = qppBaseFirstCurrent + qpp2Current + eiCurrent + qpipCurrent + federalTaxPerPeriod + quebecTaxPerPeriod;
  const otherDeductionsPerPeriod = rrsp + otherPreTax;
  const totalDeductionsPerPeriod = statutoryDeductionsPerPeriod + otherDeductionsPerPeriod;
  const estimatedNetPay = gross - totalDeductionsPerPeriod;

  return {
    qppExemptionPerPeriod,
    qppBaseFirstCurrent,
    qpp2Current,
    eiCurrent,
    qpipCurrent,
    deductibleRemunerationPerPeriod,
    annualTaxableIncome,
    annualFederalBaseTax,
    annualFederalCreditValue,
    annualFederalTaxBeforeAbatement,
    quebecFederalAbatement,
    federalTaxPerPeriod,
    annualQuebecBaseTax,
    annualQuebecCreditValue,
    quebecTaxPerPeriod,
    statutoryDeductionsPerPeriod,
    otherDeductionsPerPeriod,
    totalDeductionsPerPeriod,
    estimatedNetPay,
  };
}

// Example usage
const example = calculateQuebecPayrollEstimate({
  grossPayPerPeriod: 1300,
  payPeriodsPerYear: 52,
  rrspPerPeriod: 80,
  federalClaimAmountAnnual: 16452,
  quebecClaimAmountAnnual: 0,
});

console.log(example);
