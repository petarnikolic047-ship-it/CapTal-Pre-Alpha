export type WarUpgradeKind = "security" | "war";

export type WarUpgradeEffect = {
  offenseBonus?: number;
  defenseBonus?: number;
  vaultProtectPct?: number;
  lossMult?: number;
  lootMult?: number;
  attackCooldownMult?: number;
};

export type WarUpgradeDef = {
  id: string;
  name: string;
  description: string;
  kind: WarUpgradeKind;
  targetSeconds: number;
  effect: WarUpgradeEffect;
};

export const WAR_UPGRADES: WarUpgradeDef[] = [
  {
    id: "vault-1",
    name: "Vault Reinforcement I",
    description: "+10% cash protection during raids.",
    kind: "security",
    targetSeconds: 5 * 60,
    effect: { vaultProtectPct: 0.1, defenseBonus: 4 },
  },
  {
    id: "vault-2",
    name: "Vault Reinforcement II",
    description: "+10% cash protection during raids.",
    kind: "security",
    targetSeconds: 5 * 60,
    effect: { vaultProtectPct: 0.1, defenseBonus: 4 },
  },
  {
    id: "vault-3",
    name: "Vault Reinforcement III",
    description: "+10% cash protection during raids.",
    kind: "security",
    targetSeconds: 15 * 60,
    effect: { vaultProtectPct: 0.1, defenseBonus: 6 },
  },
  {
    id: "vault-4",
    name: "Vault Reinforcement IV",
    description: "+10% cash protection during raids.",
    kind: "security",
    targetSeconds: 15 * 60,
    effect: { vaultProtectPct: 0.1, defenseBonus: 6 },
  },
  {
    id: "vault-5",
    name: "Vault Reinforcement V",
    description: "+10% cash protection during raids.",
    kind: "security",
    targetSeconds: 45 * 60,
    effect: { vaultProtectPct: 0.1, defenseBonus: 8 },
  },
  {
    id: "firewall-grid",
    name: "Firewall Grid",
    description: "Reduce raid losses by 15%.",
    kind: "security",
    targetSeconds: 15 * 60,
    effect: { lossMult: 0.85, defenseBonus: 10 },
  },
  {
    id: "insurance-net",
    name: "Insurance Net",
    description: "Protect an additional 30% of cash.",
    kind: "security",
    targetSeconds: 45 * 60,
    effect: { vaultProtectPct: 0.3, defenseBonus: 12 },
  },
  {
    id: "acquisition-1",
    name: "Acquisition Team I",
    description: "+20 offense power.",
    kind: "war",
    targetSeconds: 5 * 60,
    effect: { offenseBonus: 20 },
  },
  {
    id: "acquisition-2",
    name: "Acquisition Team II",
    description: "+45 offense power.",
    kind: "war",
    targetSeconds: 15 * 60,
    effect: { offenseBonus: 45 },
  },
  {
    id: "acquisition-3",
    name: "Acquisition Team III",
    description: "+80 offense power.",
    kind: "war",
    targetSeconds: 45 * 60,
    effect: { offenseBonus: 80 },
  },
  {
    id: "insider-intel",
    name: "Insider Intel",
    description: "+30 offense power and -15% cooldown.",
    kind: "war",
    targetSeconds: 15 * 60,
    effect: { offenseBonus: 30, attackCooldownMult: 0.85 },
  },
  {
    id: "logistics-lift",
    name: "Logistics Lift",
    description: "+10% raid loot.",
    kind: "war",
    targetSeconds: 45 * 60,
    effect: { lootMult: 1.1 },
  },
];

export const WAR_UPGRADE_BY_ID: Record<string, WarUpgradeDef> = Object.fromEntries(
  WAR_UPGRADES.map((upgrade) => [upgrade.id, upgrade])
);

export const getWarUpgradeCost = (incomePerSec: number, upgrade: WarUpgradeDef) =>
  Math.max(0, incomePerSec * upgrade.targetSeconds);
