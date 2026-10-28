# Sześć modeli postaci — paczka właściciela, 27.10.2026

Pliki GLB z dostarczonego EXP-LORE_szesc_modeli_pakiet.zip, bez zmian geometrii i animacji.

| Plik | Postać |
|---|---|
| 16.glb | Strażnik |
| 01.glb | Strażniczka |
| 12.glb | Łucznik |
| 18.glb | Łuczniczka |
| 11.glb | Młody mag bez brody i wąsów |
| mage_f.glb | Magini |

Każdy model zawiera idle, walk, attack oraz Weapon.
Oryginalny podgląd i instrukcja: [scripts/model3d/postacie3d](../../../scripts/model3d/postacie3d/).
Przekazanie do programisty: [POSTACIE3D-20261027-G001](../../../docs/poczta/od-grafika/2026-10-27_POSTACIE3D-20261027-G001_modele_do_prologu.md).

Paczka PR #23 została już włączona do wdrożenia prologu przez PR #28. Loader używa korpusu strażnika/strażniczki, a z łuczników i magów pobiera broń, animację ataku i zgodne nakrycie głowy. Mundur pozostaje ten sam. Aktualny stan i ograniczenia: [WDROZENIE.md](../../../docs/prolog/WDROZENIE.md); kontrola integracji: `npm run test:prolog-models` (także `TELEFON=1`). Nie jest to selektor sześciu swobodnych skinów.
