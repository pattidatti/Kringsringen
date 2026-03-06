/**
 * Tooltip Data Builder
 * Pure function that computes tooltip data from registry state + config files.
 * Mirrors stat calculation logic from PlayerStatsManager and ClassAbilityManager.
 */

import type { WeaponId } from '../config/weapons';
import type { AbilityTooltipData } from '../types/tooltips';
import { ABILITY_DESCRIPTIONS } from '../config/ability-descriptions';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * Builds tooltip data for a given ability/weapon slot.
 * @param slotId - The WeaponId from the hotbar slot
 * @param upgradeLevels - Current upgrade levels from registry
 * @param versCount - Current Vers count (for Skald abilities)
 * @returns Complete tooltip data ready for rendering
 */
export function getAbilityTooltipData(
  slotId: WeaponId,
  upgradeLevels: Record<string, number>,
  versCount = 0
): AbilityTooltipData | null {
  const metadata = ABILITY_DESCRIPTIONS[slotId];
  if (!metadata) return null;

  const levels = upgradeLevels || {};

  // Base tooltip structure
  const tooltip: AbilityTooltipData = {
    name: metadata.name,
    description: metadata.description,
    color: metadata.color,
    special: [],
  };

  // ─── KRIEGER ABILITIES ─────────────────────────────────────────────────────
  if (slotId === 'sword') {
    const dmgLvl = levels['damage'] || 0;
    const kbLvl = levels['knockback'] || 0;
    const baseDmg = GAME_CONFIG.PLAYER.BASE_DAMAGE;
    const currentDmg = baseDmg * (1 + dmgLvl * 0.1);

    tooltip.damage = {
      label: 'Skade',
      value: Math.floor(currentDmg),
      bonus: dmgLvl > 0 ? `+${(dmgLvl * 10)}%` : undefined,
    };

    if (kbLvl > 0) {
      tooltip.special?.push(`Dytt: +${kbLvl * 15}% avstand`);
    }

    const eclipseLvl = levels['sword_eclipse'] || 0;
    if (eclipseLvl > 0) {
      tooltip.special?.push(`Solsnu: Etterlater mørk sti (${eclipseLvl * 30}% skade)`);
    }
  }

  if (slotId === 'ability_whirlwind') {
    const whirlDmgLvl = levels['whirl_damage'] || 0;
    const whirlCdLvl = levels['whirl_cooldown'] || 0;
    const whirlChainLvl = levels['whirl_chain'] || 0;

    const baseCd = 8000;
    const currentCd = baseCd * Math.pow(0.8, whirlCdLvl);

    tooltip.cooldown = {
      label: 'Ventetid',
      value: `${(currentCd / 1000).toFixed(1)}`,
      bonus: whirlCdLvl > 0 ? `${((baseCd - currentCd) / 1000).toFixed(1)}s spart` : undefined,
      suffix: 's',
    };

    tooltip.damage = {
      label: 'Skade',
      value: `${100 + whirlDmgLvl * 25}%`,
      bonus: whirlDmgLvl > 0 ? `+${whirlDmgLvl * 25}%` : undefined,
    };

    tooltip.radius = { label: 'Rekkevidde', value: 120, suffix: 'px' };
    tooltip.duration = { label: 'Varighet', value: 3, suffix: 's' };

    if (whirlChainLvl > 0) {
      const reduction = whirlChainLvl === 1 ? 25 : 35;
      tooltip.special?.push(`Reduserer ventetid med ${reduction}% ved treff`);
    }
  }

  if (slotId === 'ability_bulwark') {
    tooltip.cooldown = { label: 'Ventetid', value: 12, suffix: 's' };
    tooltip.duration = { label: 'Varighet', value: 5, suffix: 's' };
    tooltip.special?.push('Blokkerer all inkommende skade');
  }

  if (slotId === 'ability_grapple') {
    tooltip.cooldown = { label: 'Ventetid', value: 10, suffix: 's' };
    tooltip.radius = { label: 'Rekkevidde', value: 400, suffix: 'px' };
    tooltip.special?.push('Drar alle fiender mot deg');
    tooltip.special?.push('Stunner fiender kort ved treff');
  }

  // ─── ARCHER ABILITIES ──────────────────────────────────────────────────────
  if (slotId === 'bow') {
    const arrowDmgLvl = levels['arrow_damage'] || 0;
    const arrowSpdLvl = levels['arrow_speed'] || 0;
    const pierceLvl = levels['pierce'] || 0;
    const bowCdLvl = levels['bow_cooldown'] || 0;
    const multishotLvl = levels['multishot'] || 0;

    const baseCd = GAME_CONFIG.WEAPONS.BOW.cooldown;
    const currentCd = baseCd / (1 + bowCdLvl * 0.15);

    tooltip.cooldown = {
      label: 'Ventetid',
      value: `${(currentCd / 1000).toFixed(2)}`,
      bonus: bowCdLvl > 0 ? `-${(bowCdLvl * 10)}%` : undefined,
      suffix: 's',
    };

    tooltip.damage = {
      label: 'Skade',
      value: '100%',
      bonus: arrowDmgLvl > 0 ? `+${arrowDmgLvl * 15}%` : undefined,
    };

    if (multishotLvl > 0) {
      tooltip.projectiles = { label: 'Piler', value: 1 + multishotLvl };
    }

    if (pierceLvl > 0) {
      tooltip.special?.push(`Går gjennom ${pierceLvl} fiender`);
    }

    if (arrowSpdLvl > 0) {
      tooltip.special?.push(`Pilhastighet: +${arrowSpdLvl * 20}%`);
    }

    const explosiveLvl = levels['explosive_arrow'] || 0;
    if (explosiveLvl > 0) {
      const radius = 80 + (explosiveLvl - 1) * 50;
      tooltip.special?.push(`Eksploderer (${radius}px radius)`);
    }

    const poisonLvl = levels['poison_arrow'] || 0;
    if (poisonLvl > 0) {
      const ticks = [4, 6, 8][poisonLvl - 1];
      tooltip.special?.push(`Forgifter fiender (${ticks} tikk)`);
    }

    const singularityLvl = levels['bow_singularity'] || 0;
    if (singularityLvl > 0) {
      const radius = 150 + singularityLvl * 30;
      tooltip.special?.push(`Kaskade-felt (${radius}px radius)`);
    }
  }

  if (slotId === 'ability_explosive') {
    const countLvl = levels['volley_count'] || 0;
    const damageLvl = levels['volley_damage'] || 0;
    const pierceLvl = levels['volley_pierce'] || 0;

    const totalArrows = 15 + countLvl * 5;

    tooltip.cooldown = { label: 'Ventetid', value: 12, suffix: 's' };
    tooltip.count = {
      label: 'Piler',
      value: totalArrows,
      bonus: countLvl > 0 ? `+${countLvl * 5}` : undefined,
    };

    tooltip.damage = {
      label: 'Skade per pil',
      value: `${(1.0 + damageLvl * 0.2).toFixed(1)}x`,
      bonus: damageLvl > 0 ? `+${(damageLvl * 0.2).toFixed(1)}x` : undefined,
    };

    if (pierceLvl > 0) {
      tooltip.special?.push(`Går gjennom ${pierceLvl} fiender`);
    }
  }

  if (slotId === 'ability_vault') {
    tooltip.cooldown = { label: 'Ventetid', value: 7, suffix: 's' };
    tooltip.special?.push('Hopper bakover 180px');
    tooltip.special?.push('Skyter 5 piler i vifte');
  }

  if (slotId === 'ability_decoy') {
    tooltip.cooldown = { label: 'Ventetid', value: 15, suffix: 's' };
    tooltip.duration = { label: 'Usynlighet', value: 1.5, suffix: 's' };
    tooltip.special?.push('Plasserer lokkefugl som tiltrekker fiender');
  }

  // ─── WIZARD ABILITIES ──────────────────────────────────────────────────────
  if (slotId === 'fireball') {
    const fireDmgLvl = levels['fire_damage'] || 0;
    const fireRadLvl = levels['fire_radius'] || 0;
    const fireSpdLvl = levels['fire_speed'] || 0;
    const massivLvl = levels['massiv_eksplosjon'] || 0;

    const baseRadius = GAME_CONFIG.WEAPONS.FIREBALL.splashRadius;
    const currentRadius = baseRadius + fireRadLvl * 30 + massivLvl * 40;

    tooltip.damage = {
      label: 'Skade',
      value: '100%',
      bonus: fireDmgLvl > 0 ? `+${fireDmgLvl * 15}%` : undefined,
    };

    tooltip.radius = {
      label: 'Eksplosjon',
      value: currentRadius,
      bonus: (fireRadLvl + massivLvl) > 0 ? `+${currentRadius - baseRadius}px` : undefined,
      suffix: 'px',
    };

    if (fireSpdLvl > 0) {
      tooltip.special?.push(`Prosjektilhastighet: +${fireSpdLvl * 15}%`);
    }

    const chainLvl = levels['fire_chain'] || 0;
    if (chainLvl > 0) {
      tooltip.special?.push('Eksplosjoner sprer seg til andre fiender');
    }
  }

  if (slotId === 'frost') {
    const frostDmgLvl = levels['frost_damage'] || 0;
    const frostRadLvl = levels['frost_radius'] || 0;
    const frostSlowLvl = levels['frost_slow'] || 0;

    const baseRadius = GAME_CONFIG.WEAPONS.FROST.radius;
    const currentRadius = baseRadius + frostRadLvl * 20;
    const slowDuration = 1000 + frostSlowLvl * 800;

    tooltip.damage = {
      label: 'Skade',
      value: '100%',
      bonus: frostDmgLvl > 0 ? `+${frostDmgLvl * 15}%` : undefined,
    };

    tooltip.radius = {
      label: 'Rekkevidde',
      value: currentRadius,
      bonus: frostRadLvl > 0 ? `+${currentRadius - baseRadius}px` : undefined,
      suffix: 'px',
    };

    tooltip.duration = {
      label: 'Frys',
      value: `${(slowDuration / 1000).toFixed(1)}`,
      bonus: frostSlowLvl > 0 ? `+${((slowDuration - 1000) / 1000).toFixed(1)}s` : undefined,
      suffix: 's',
    };

    const shatterLvl = levels['frost_shatter'] || 0;
    if (shatterLvl > 0) {
      tooltip.special?.push('Frosne fiender tar mer skade');
    }
  }

  if (slotId === 'lightning') {
    const ltgDmgLvl = levels['lightning_damage'] || 0;
    const ltgBounceLvl = levels['lightning_bounces'] || 0;
    const ltgStunLvl = levels['lightning_stun'] || 0;
    const ltgVoltageLvl = levels['lightning_voltage'] || 0;

    const baseBounces = GAME_CONFIG.WEAPONS.LIGHTNING.bounces;
    const currentBounces = baseBounces + ltgBounceLvl;

    tooltip.damage = {
      label: 'Skade',
      value: '100%',
      bonus: ltgDmgLvl > 0 ? `+${ltgDmgLvl * 15}%` : undefined,
    };

    tooltip.special?.push(`Spretter til ${currentBounces} mål ${ltgBounceLvl > 0 ? `(+${ltgBounceLvl})` : ''}`);

    if (ltgStunLvl > 0) {
      tooltip.special?.push(`${ltgStunLvl * 10}% sjanse for stun`);
    }

    if (ltgVoltageLvl > 0) {
      tooltip.special?.push(`+${ltgVoltageLvl * 15}% skade per sprett`);
    }
  }

  if (slotId === 'ability_cascade') {
    const cascadeDurLvl = levels['cascade_duration'] || 0;
    const cascadeRadLvl = levels['cascade_radius'] || 0;
    const cascadeDmgLvl = levels['cascade_damage'] || 0;
    const manaringLvl = levels['manaring'] || 0;

    const duration = 3 + cascadeDurLvl * 0.5;
    const radiusMult = 1 + cascadeRadLvl * 0.25;

    tooltip.cooldown = { label: 'Ventetid', value: 12, suffix: 's' };

    tooltip.duration = {
      label: 'Varighet',
      value: `${duration.toFixed(1)}`,
      bonus: cascadeDurLvl > 0 ? `+${(cascadeDurLvl * 0.5).toFixed(1)}s` : undefined,
      suffix: 's',
    };

    tooltip.radius = {
      label: 'Radius',
      value: `${(radiusMult * 100).toFixed(0)}%`,
      bonus: cascadeRadLvl > 0 ? `+${cascadeRadLvl * 25}%` : undefined,
    };

    tooltip.damage = {
      label: 'Senterskade',
      value: '300%',
      bonus: cascadeDmgLvl > 0 ? `+${cascadeDmgLvl * 50}%` : undefined,
    };

    if (manaringLvl > 0) {
      const reduction = manaringLvl === 1 ? 25 : 40;
      tooltip.special?.push(`Gir ${reduction}% skadereduksjon mens aktiv`);
    }
  }

  // ─── SKALD ABILITIES ───────────────────────────────────────────────────────
  if (slotId === 'harp_bolt') {
    tooltip.damage = { label: 'Skade', value: '100%' };
    tooltip.special?.push('Grunnleggende lydangrep');
  }

  if (slotId === 'ability_vers_bolt') {
    const versDmgLvl = levels['sonic_damage'] || 0;
    const pierceLvl = levels['sonic_pierce'] || 0;
    const slowLvl = levels['stridssang_slow'] || 0;

    tooltip.cooldown = { label: 'Ventetid', value: 2, suffix: 's' };

    tooltip.damage = {
      label: 'Skade',
      value: '100%',
      bonus: versDmgLvl > 0 ? `+${versDmgLvl * 20}%` : undefined,
    };

    tooltip.count = {
      label: 'Bolter',
      value: `1 + Vers (nå: ${1 + versCount})`,
    };

    if (pierceLvl > 0) {
      tooltip.special?.push(`Går gjennom ${pierceLvl} fiender`);
    }

    if (slowLvl > 0) {
      const duration = 0.5 + slowLvl * 0.5;
      tooltip.special?.push(`Bremser fiender i ${duration}s`);
    }

    tooltip.special?.push('Forbruker alle Vers');
  }

  if (slotId === 'ability_kvad_inspire') {
    const durationLvl = levels['kvad_duration'] || 0;
    const duration = 5 + durationLvl * 1;

    tooltip.cooldown = { label: 'Ventetid', value: 8, suffix: 's' };

    tooltip.duration = {
      label: 'Varighet',
      value: duration,
      bonus: durationLvl > 0 ? `+${durationLvl}s` : undefined,
      suffix: 's',
    };

    tooltip.special?.push('Krever 2 Vers');
    tooltip.special?.push('+25% skade og fart');

    const healAmount = 30 + durationLvl * 10;
    tooltip.special?.push(`Heler ${healAmount} HP ved aktivering`);
  }

  if (slotId === 'ability_kvad_seier') {
    const kvadRadiusLvl = levels['kvad_radius'] || 0;
    const ekkoLvl = levels['ekko'] || 0;
    const blodkvadLvl = levels['blodkvad'] || 0;
    const anthemLvl = levels['anthem_of_fury'] || 0;

    const radius = 200 + kvadRadiusLvl * 30;

    tooltip.cooldown = { label: 'Ventetid', value: 20, suffix: 's' };
    tooltip.damage = { label: 'Skade', value: '250%' };

    tooltip.radius = {
      label: 'Rekkevidde',
      value: radius,
      bonus: kvadRadiusLvl > 0 ? `+${kvadRadiusLvl * 30}px` : undefined,
      suffix: 'px',
    };

    tooltip.special?.push('Krever 4 Vers');
    tooltip.special?.push('Stunner fiender i 3s');

    if (ekkoLvl > 0) {
      tooltip.special?.push('4 ekstra treff over tid (60% skade)');
    }

    if (blodkvadLvl > 0) {
      tooltip.special?.push(`${blodkvadLvl * 15}% livsstjeling`);
    }

    if (anthemLvl > 0) {
      tooltip.special?.push(`Gir +${anthemLvl * 20}% skade i 8s`);
    }
  }

  // ─── SYNERGI STATS ─────────────────────────────────────────────────────────
  const soulLinkLvl = levels['magic_soul_link'] || 0;
  if (soulLinkLvl > 0 && (slotId === 'fireball' || slotId === 'frost' || slotId === 'lightning')) {
    tooltip.special?.push('Sjelelenke: Kobler fiender sammen');
  }

  return tooltip;
}
