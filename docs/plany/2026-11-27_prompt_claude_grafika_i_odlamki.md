# Prompt dla Claude – rysowanie świata i odłamki komety (sesja z właścicielem)

Skopiuj wszystko poniżej linii do nowej sesji Claude Code w tym repozytorium.

---

Przeczytaj `CLAUDE.md`. Pracujemy dziś z właścicielem nad tym, co wymaga rysowania kodem w stylu świata gry 09 (generator w `src/gen/`, pikselowa gęstość `GEN_DOTS`, kontur #1e1a24, światło z północnego zachodu, paleta `PALETA_SWIATA`, zasada „wszystko na mapie rysujemy kodem”). Limit pracy jest mały: rób punkty po kolei, po każdym build + zrzut ekranu (Playwright, komputer i telefon) + commit i krótka notatka w `CLAUDE.md`. Ta sesja startuje sama z harmonogramu (sobota 28 XI 2026, 22:11), więc właściciel może jej nie oglądać na żywo: po każdym punkcie wyślij mu zrzuty (SendUserFile), wypchnij gałąź i rób dalej, nie czekając na „ok”. Jeśli odpowie w trakcie, jego uwagi mają pierwszeństwo. Nic nie idzie na produkcję.

Najpierw sprawdź, co z planu dla Codexa (`docs/plany/2026-11-27_prompt_codex_silnik.md`) już jest w gałęzi: mikstury za złoto, apteki, pytanie przechodniów „Gdzie znajdę…?”, wspólna skrzynia przy poczcie, hotel jako dom, paszport. Opieraj się na tym, nie rób tego drugi raz.

## Kierunek gry (decyzje właściciela, 27 XI 2026)

- Gra ma być podróżą po świecie, a nie krążeniem po jednym mieście. Przez miasto się przechodzi; zostaje się tylko dla lokalnej historii.
- Nadrzędny cel: **odłamki komety**. Smoki strzegą ich w kilku–kilkunastu znanych miejscach świata. Gracz zbiera odłamki i porównuje je między sobą. Na końcu może się okazać, że to wcale nie kometa (co to jest – do wymyślenia później, nie przesądzaj w tekstach).
- Bez walk i odłamków w miejscach świętych i zamkniętych (np. Mekka); unikamy symboli religijnych.

## Punkty (kolejność = priorytet)

### 1. Odłamki komety – szkielet
- `src/content/odlamki.ts`: lista 12–15 miejsc (lat/lon, nazwa PL/EN, gatunek smoka z `GATUNKI_SMOKOW`, kolor/cecha odłamka). Propozycja do zatwierdzenia przez właściciela: rozłożone na kontynentach (np. Sigiriya, Tokio, Wielki Kanion, Stonehenge, Islandia, Kapadocja, Ha Long, Kilimandżaro, Machu Picchu, Uluru, Tatry, Las Vegas/Mojave), w terenie, gdzie da się dojść.
- Na miejscu: legowisko (istniejące `SmokiNaMapie` + `LEGOWISKO`, dym widoczny z daleka), smok danego gatunku z mocą odpowiednią do końcowej gry, po zwycięstwie odłamek – osobny przedmiot fabularny na każde miejsce (ikona: istniejąca `odlamek_komety`, zabarwiona kodem na kolor odłamka).
- Odłamek rysowany kodem na ziemi i w ręku: kryształ z poświatą w kolorze miejsca, w stylu świata.
- Dziennik: wpis „Odłamki komety N/M” z kierunkiem do najbliższego niezebranego (słownie, bez dokładnej strzałki na drugi koniec świata).
- Kufer: „Gablota odłamków” – każdy zebrany odłamek obok siebie, z krótką notatką „czym się różni” (kolor, ciepło, dźwięk, napis). To jest „porównywanie”; teksty pisz tak, żeby zostawiały tajemnicę.

### 2. Przejęte podwórka
Według dokumentu właściciela „Drogowskazy i przejęte podwórka” (pilotaż w Lublinie): 2–3 budynki wokół podwórka przy uczęszczanej trasie stają się krótkim miejscem walki na powierzchni. Wykorzystaj istniejące części: `CityMap.cutCourtyards` (podwórka z bramami), grupy z `Lowiska`/siedlisk (stałe miejsca, `Pakiet.stale`), bestiariusz z `STWORY_AI`. Rysowanie kodem: bluszcz (`OpcjeBudynku.bluszcz`), wybite okna, dym z okna, brak fragmentu dachu – widoczne z kamery; wejście widać z ulicy. Gracz może wejść albo minąć bez zaczepki. Stały wynik dla tych samych danych mapy. Sprawdź regułę też na gęstej siatce ulic i w małej miejscowości.

### 3. Drogowskazy do usług
Na rozwidleniach przy trasie do najbliższego alchemika/sklepu znak z ikoną usługi. Wykorzystaj `src/drogowskazy/Drogowskazy.ts` (`obrazZnaku`, strzałki w 8 kierunkach, wybór skrzyżowań) – dorysuj ikony usług (butelka, worek, krzyż, rura poczty) w tym samym ręcznym stylu.

### 4. Drobiazgi graficzne do mechaniki od Codexa (jeśli są i zostanie czasu)
- słup poczty pneumatycznej jako czytelna skrzynia wspólna (lekka poświata/ruch zaworu, gdy gracz jest blisko),
- pieczątki paszportu rysowane kodem (okrągłe/kanciaste, kolor kraju, nazwa miasta),
- znak „tu nocujesz” przy hotelu, który jest teraz domem (mała tabliczka/klucz przy wejściu).

## Na koniec
Napisz właścicielowi po polsku, co powstało, ze zrzutami, i listę rzeczy na kolejną sesję. Bez wydania na produkcję, chyba że właściciel wprost o to poprosi.
