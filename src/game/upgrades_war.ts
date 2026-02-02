export type WarUpgradeKind = "security" | "war";

export type WarUpgradeEffect = {
  offenseBonus?: number;
  defenseBonus?: number;
  vaultProtectPct?: number;
  lossMult?: number;
  lootMult?: number;
  attackCooldownMult?: number;
  shieldDurationBonusSec?: number;
};

export type WarUpgradeDef = {
  id: string;
  name: string;
  description: string;
  kind: WarUpgradeKind;
  baseSeconds: number;
  costGrowth: number;
  effectPerLevel: WarUpgradeEffect;
};

export const WAR_UPGRADES: WarUpgradeDef[] = [
  {
    id: "vault-reinforcement",
    name: "Vault Reinforcement",
    description: "+2% vault protection per level.",
    kind: "security",
    baseSeconds: 300,
    costGrowth: 1.45,
    effectPerLevel: { vaultProtectPct: 0.02 },
  },
  {
    id: "fortification-protocol",
    name: "Fortification Protocol",
    description: "+6 defense per level.",
    kind: "security",
    baseSeconds: 300,
    costGrowth: 1.5,
    effectPerLevel: { defenseBonus: 6 },
  },
  {
    id: "shield-extension",
    name: "Shield Extension",
    description: "+15s shield duration per level.",
    kind: "security",
    baseSeconds: 600,
    costGrowth: 1.55,
    effectPerLevel: { shieldDurationBonusSec: 15 },
  },
  {
    id: "acquisition-ops",
    name: "Acquisition Ops",
    description: "+6 offense per level.",
    kind: "war",
    baseSeconds: 300,
    costGrowth: 1.5,
    effectPerLevel: { offenseBonus: 6 },
  },
  {
    id: "loot-optimization",
    name: "Loot Optimization",
    description: "+3% loot per level.",
    kind: "war",
    baseSeconds: 600,
    costGrowth: 1.45,
    effectPerLevel: { lootMult: 1.03 },
  },
  {
    id: "rapid-strikes",
    name: "Rapid Strikes",
    description: "-3% raid cooldown per level.",
    kind: "war",
    baseSeconds: 600,
    costGrowth: 1.55,
    effectPerLevel: { attackCooldownMult: 0.97 },
  },
];

export const WAR_UPGRADE_BY_ID: Record<string, WarUpgradeDef> = Object.fromEntries(
  WAR_UPGRADES.map((upgrade) => [upgrade.id, upgrade])
);

export const getWarUpgradeCost = (
  incomePerSec: number,
  upgrade: WarUpgradeDef,
  level: number
) => Math.max(0, incomePerSec * upgrade.baseSeconds * Math.pow(upgrade.costGrowth, level));
