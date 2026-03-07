# Fix: Senk volum på enemy-hit (punch) SFX

## Kontekst

Punch-lyden som spilles ved hvert fiendetreff (`Enemy.takeDamage()`) er for høy. Med mange fiender blir det overveldende.

## Endring

| Fil | Endring |
|---|---|
| `src/game/AudioManifest.ts` linje 80 | Senk `volume` fra `0.45` → `0.15` |

~1/3 av nåværende nivå. Fortsatt hørbar men dominerer ikke miksen.

## Verifisering

1. `npm run build`
2. Test i spill — punch-lyden skal være tydelig dempet men hørbar
