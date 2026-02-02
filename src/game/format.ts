const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  return moneyFormatter.format(safe);
};

export const formatRate = (value: number) => `+${formatMoney(value)} / sec`;

export const formatDuration = (ms: number) => {
  const safe = Number.isFinite(ms) ? Math.max(ms, 0) : 0;
  const seconds = safe / 1000;
  if (seconds < 60) {
    const digits = seconds < 10 ? 1 : 0;
    return `${seconds.toFixed(digits)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remSeconds}s`;
};

export const formatMultiplier = (value: number) => {
  const safe = Number.isFinite(value) ? value : 1;
  const digits = Math.abs(safe - Math.round(safe)) < 0.01 ? 0 : 1;
  return `x${safe.toFixed(digits)}`;
};