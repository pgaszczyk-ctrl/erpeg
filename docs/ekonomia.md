# Exp-lore – ekonomia, przedmioty, pojazdy

Szkic z czatu 🛠 Technika (4 X 2026) z decyzjami właściciela. Liczby to punkt
startowy; mają być pokrętłami w panelu admina (⚙ Ustawienia → „Pokrętła gry”,
`src/content/ustawienia.ts`).

## Decyzje właściciela (4 X 2026)
- **Każdy sklep skupuje** owoce, warzywa, grzyby i drewno (skup zależny od trudności usunięty). ✅ w grze testowej
- **Pieszo 60 km/h.** ✅
- **Kamień mocy usunięty.** Wskrzeszenie za diamenty (`WSKRZESZENIE.diamentow`, domyślnie 10, pokrętło `wskrzeszenie_diamenty`): po śmierci, gdy bohater ma dość diamentów, gra pyta „Porażka. Moc diamentów może cię ocalić. Czy chcesz to zrobić?”. W menu martwej postaci: pierwsze wskrzeszenie za darmo, kolejne za tyle samo diamentów (RPC `resurrect`). Stare kamienie zamieniają się na diamenty (1 kamień = jedno wskrzeszenie). ✅
- **Miedź zbierają gracze**; kowal przerabia ją na mosiądz z własnych zapasów za pieniądze (mosiądz = miedź + praca kowala, bez cynku w grze).
- **Ceny będą przerabiane** razem z nową gospodarką (na razie mnożniki w pokrętłach).
- **Miecze magiczne** (Świetlisty, Gromowładny) zostają poza drabinką broni; trudno je naprawić – później naprawa za diamenty i składniki.
- Kolejność prac: patrz „Plan” na dole.

## Zasady gospodarki
- Serwer trzyma zapas przedmiotów osobno w każdym mieście.
- Każda rzecz ma „kran” (skąd przybywa) i „odpływ” (gdzie znika): zużycie narzędzi i broni, naprawy, wyrób u kowala, część plecaka przy śmierci, opłaty na tablicy, złomowanie.
- NPC skupuje zawsze. Gdy półka ma miejsce: normalna cena (zależna od zapasu). Gdy pełna: cena złomu, przedmiot idzie do huty/złomowca.
- Huta przetapia złom na surowiec dla miasta (mniej niż poszło na wyrób, np. miecz z 2 sztab → 1 sztaba). Pętla: złom → huta → sztaba → kowal → wyrób.
- NPC sprzedaje drożej, niż skupuje (np. kupuje za 40% wartości).
- Pusty zapas: raz na dobę „wóz z dostawą” (1 szt.).
- Tablica ogłoszeń w każdym mieście: opłata + prowizja, widełki 0,5×–3× ceny bazowej, wygasa po 3 dniach, limit ogłoszeń, handel od ~3. poziomu.
- Gra działa w pełni z samym NPC; handel między graczami to bonus.
- Panel admina: łączna ilość złota w grze (✅ w Ustawieniach), zapas w każdym mieście. Startujemy skąpo.
- **Uwaga techniczna:** dziś dobytek gracza zapisuje jego telefon i serwer mu ufa. Zanim powstaną wspólne zapasy miast i tablica, serwer musi sam pilnować, co kto ma (inaczej oszust psuje grę innym).

## Surowce
drewno · węgiel · żelazo · miedź · piasek · odłamki komety (+ jedzenie od rolników)
- Bez narzędzia: chrust (opał), kij (łuk). Siekiera → drewno. Kilof → ruda.
- Półprodukty: stal = żelazo + węgiel; mosiądz = miedź (u kowala, za pieniądze); szkło = piasek + węgiel; ogniwo (magia) = mosiądz + odłamek lub energia z maszynowni.
- Lublin: węgiel tani (Bogdanka), drewno, piasek. Żelazo – import lub złom. Miedź – gracze zbierają (złom: rury, kable, mosiężne graty chochlików), import NPC drożej, handel międzymiastowy; wymiana węgiel ↔ miedź jako misja dla woźnicy.

## Broń
- Białe: 0 kij · 1 żelazo · 2 mosiądz · 3 stal · 4 stal hartowana · 5 stal damasceńska (stal + odłamek komety). Szklany miecz – bardzo mocny, pęka po ~15 ciosach na każdym poziomie trudności.
- Dziś w grze: kijek 1, żelazny 4, stalowy 7, rycerski 12 (moc) – do przeliczenia na nową drabinkę.
- Dystansowe: łuk, łuk refleksyjny, łuk długi, kusza, pistolet parowy. Amunicja: strzały, bełty, naboje (mosiądz + węgiel).
- Magia: ładunki (maszynownia za węgiel albo odłamek), pokazywane jak amunicja.
- Zużycie broni od poziomu Średni (Dziecięcy i Młody bez zużycia).

## Regiony kulturowe (nazwy i wygląd broni po kraju)
| Region | Miecz st. 3–5 | Łuk/kusza | Szklany | Pistolet |
|---|---|---|---|---|
| Europa Śr.-Wsch. (PL) | miecz stalowy → szabla → karabela damasceńska | łuk refleksyjny | szklany miecz | pistolet parowy |
| Europa Zach. i Płn. | miecz długi → rapier → Ulfberht | łuk długi, kusza | szklany miecz | pistolet parowy |
| Bliski Wschód, Afryka Płn. | szamszir | łuk kompozytowy | szklany szamszir | pistolet parowy |
| Indie, Azja Płd. | talwar → khanda → talwar z wootzu | łuk kompozytowy | szklany talwar | pistolet parowy |
| Chiny, Korea | jian/dao | kusza powtarzalna, łuk gakgung | szklany jian | pistolet parowy |
| Japonia | bokken (0) → katana → katana z tamahagane | yumi | szklana katana | tanegashima parowa |
| Stepy | szabla stepowa | łuk mongolski | szklana szabla | pistolet parowy |
| Afryka Subsaharyjska | takouba, kaskara | łuk | szklana takouba | pistolet parowy |
| Ameryka Łac. | maczeta | łuk | macuahuitl z obsydianu | pistolet parowy |
| Reszta świata | zestaw europejski | | | |

## GUI sklepów, kowala, złomowca
- NPC z kwestią u góry → zakładki → siatka dużych kafelków (ikona, cena, zapas; pusty = wyszarzony „dostawa jutro”) → karta szczegółów z porównaniem do noszonego i jednym dużym przyciskiem.
- Zakładki: sklep Kup/Sprzedaj; kowal Kup/Zrób/Napraw/Przetop; złomowiec Sprzedaj/Przetop.
- „Sprzedaj cały złom” jednym dotknięciem; „Zrób”: przepis z ikon ✓/✗ + skąd brakujący; cena kupca w plecaku.
- Amunicja: licznik przy broni (czerwony < 10); w sklepie +10 / +50 / do pełna; kołczan = 1 miejsce, limit ~50.

## Biomy (jedzenie)
umiarkowany · śródziemnomorski · pustynny · tropikalny · monsunowy · zimny · + góry (> ~1500 m). Biom z darmowej mapy klimatów; region z kraju. Owoce działają wszędzie tak samo; przepisy regionalne leczą mocniej. Później: pory roku.

## Ruch i pojazdy
- Pieszo 60 km/h ✅. Rower +25%, hulajnoga parowa +40% (bak ~100 km, węgiel albo diament). Tylko na drogach/ścieżkach; atak gangu = zsiadanie.

## Diament – waluta premium
- Skondensowany węgiel; spalanie go to magia. Kupuje wygodę (paliwo, szybkość, wygląd, wskrzeszenie), nigdy siłę broni.
- Rzadko w grze (smok, odłamki). Bez handlu diamentami na tablicy. Zakup tylko z kontem; ceny w zł obok, bez skrzynek losowych, zgoda rodzica – sprawdzić prawnie. Płatności BLIK/Przelewy24.

## Plan (kolejność)
1. ✅ 60 km/h, każdy sklep skupuje, wskrzeszenie za diamenty, pokrętła w panelu + licznik złota.
2. Zużycie broni, naprawa, szklany miecz, amunicja i kołczan.
3. Surowce, siekiera/kilof, kowal (bez wspólnych zapasów).
4. Nowy wygląd sklepów (kafelki, porównanie).
5. Zapasy miast, złomowiec, huta – z serwerem pilnującym dobytku.
6. Tablica ogłoszeń, pojazdy, regiony, biomy, płatności.
