export const clampToInt = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
};

export const clampToNumber = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
};
