import type { TempBuff } from "../types";

export const pruneExpiredBuffs = (buffs: TempBuff[], now: number) =>
  buffs.filter((buff) => buff.expiresAt > now);
