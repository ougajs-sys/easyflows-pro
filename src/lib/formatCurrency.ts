const DEFAULT_LOCALE = "fr-FR";
const DEFAULT_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: "decimal",
  maximumFractionDigits: 0,
};
const THOUSAND = 1000;
const MILLION = 1000000;

export type FormatCurrencyOptions = Intl.NumberFormatOptions & {
  compact?: boolean;
  locale?: string;
};

export const formatCurrency = (
  amount: number,
  options: FormatCurrencyOptions = {}
) => {
  if (options?.compact) {
    const sign = amount < 0 ? "-" : "";
    const absoluteAmount = Math.abs(amount);

    if (absoluteAmount >= MILLION) {
      return `${sign}${(absoluteAmount / MILLION).toFixed(1)}M`;
    }
    if (absoluteAmount >= THOUSAND) {
      return `${sign}${(absoluteAmount / THOUSAND).toFixed(0)}K`;
    }
    return `${sign}${absoluteAmount.toString()}`;
  }

  const { compact, locale, ...formatOptions } = options;
  const mergedOptions = { ...DEFAULT_FORMAT_OPTIONS, ...formatOptions };
  return new Intl.NumberFormat(locale ?? DEFAULT_LOCALE, mergedOptions).format(amount);
};
