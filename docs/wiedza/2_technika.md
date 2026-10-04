# Exp-lore – wiedza dla czatu 🛠 Technika i rozwój

## Budowa
- Phaser 4 + TypeScript + Vite; `npm run build` = sprawdzenie typów + budowa. Repozytorium `pgaszczyk-ctrl/erpeg`, gałąź robocza `claude/bold-gauss-peehzd`. Deploy przez GitHub Actions (deploy.yml): produkcja z commita w pliku `PRODUKCJA`, test z najnowszego commita.
- Serwer: Supabase (projekt `erpeg`). Wszystko idzie przez funkcje RPC (SECURITY DEFINER), tabele mają RLS bez polityk. Piaskownica Claude nie łączy się z supabase.co, więc bazę sprawdzamy SQL-em przez konektor, a grę przez Playwright z podstawionymi odpowiedziami serwera.
- Testy: Playwright w Chromium (widok telefonu Pixel 7), zrzuty ekranu. Próbki mapy świata do testów: `data/world-sample/*.pmtiles` (Zakopane, Kraków, Lublin, Szczecin, Gorzów, Berlin, Madryt, Puławy).

## Mapy
- **Lublin** z okolicami: dane OSM → `scripts/build-map.mjs` → kafelki 1 km (`public/map/lublin/`), doczytywane w promieniu 2 km od bohatera.
- **Miasteczka przy stacjach** w województwie: osobne małe mapy, a woźnice wożą między nimi.
- **Mapa świata**: Protomaps (~120 GB, Cloudflare R2), uproszczony wygląd, wysokości terenu (poziomice, szczyty, strome zbocza blokują poza szlakami).
- **Przejście pieszo** z mapy świata do Lublina: 80 m za granicą bohater trafia na prawdziwą mapę Lublina, a pchanie się przez granicę Lublina wyprowadza na mapę świata.
- Mosty: na mapie świata most Mościckiego w Puławach jest przejezdny. Zgłoszenia 42/43 dotyczyły miejsc, gdzie mostu naprawdę nie ma.

## Wydajność i telefony
- Ostrzejszy obraz (2 piksele na piksel ekranu). Na wolnych telefonach (poniżej 35 klatek na sekundę) gra przechodzi na zwykły.
- Pamięć grafiki: zmniejszona z 75 do ~39 MB (najwyżej 8 kawałków mapy, 6 na słabszych telefonach). Utrata grafiki na telefonie → okienko „Wczytaj ponownie”, które zapisuje grę i wraca w to samo miejsce.
- **Do obserwacji:** zapis Arceusa ma ~870 kB (mgła wojny z map świata) i raz przekroczył czas zapisu. Możliwe odchudzenie zapisu mgły.
- Powiadomienie o nowej wersji co 30 minut (zapis + powrót w to samo miejsce).

## Mechaniki (gdzie co jest)
- Walka: `src/content/walka.ts` – obrażenia = poziom umiejętności + 1,5 × moc broni; trafienie i przerwy z tabel poziomów; mocny atak po przytrzymaniu 1 s; strzały mogą zabić od razu (5–15%).
- Wrogowie siedzą w **gangach** (czerwona mgiełka, herszt na końcu, berserkerzy, eskorta), `src/content/gangi.ts`. Smoki: `src/objects/Dragon.ts`.
- Pogoda: prawdziwa prognoza MET Norway (serwer co kilka godzin, kwadraty ~33 km). Deszcz = wodne bloby i wodniki, noc = więcej bandytów, mniej ludzi i parasole w deszczu.
- Ekwipunek, plecak 20 miejsc, esencje (nasycanie broni), talizmany, skrzynia w domu i hotelu.
- Mapa (🗺 / M): 1,2 km, 3 km, cały Lublin, województwo (odwiedzone miasta jako 3 litery), Polska (odwiedzone miasta wojewódzkie). Bez konturów granic, z przesuwaniem palcem.
- Zapisy: przy wejściu do budynku z misją, po misji, w hotelu i namiocie. Zamknięcie karty bez „Wyjdź” = 10 s bezbronności przy następnym wejściu (nie dotyczy postaci testowych ani przeładowania po utracie grafiki).

## Dzienniki i zgłoszenia
- Błędy gry trafiają do tabeli `client_errors` (zakładka panelu „🐞 Błędy”). Zgłoszenia graczy (ze zrzutem ekranu i dziennikiem ostatnich zdarzeń) trafiają do `bug_reports` (zakładka „🪲 Zgłoszenia”).
- Otwarte zgłoszenia (stan na 4 X 2026):
  - 6 – zostaje, tło w Katowicach;
  - 13, 14 – fontanna i kościoły na torach;
  - 17, 21, 22, 26 – góry;
  - 19 – samonaprowadzanie łuku;
  - 20, 54 – drogowskazy i układ HUD;
  - 25, 28 – nowy układ ekranu;
  - 27 – album osiągnięć;
  - 29 – niespodzianki reklamowe;
  - 31, 39 – życie na drogach, prom;
  - 32 – różne ostrzeżenia gangów;
  - 33, 44 – rolnicy i pola;
  - 34 – budynki innego kształtu;
  - 35 – kopie zapasowe bazy;
  - 36–38 – drzewo i rzeka na rzece, gangi na wodzie;
  - 40 – pusty las;
  - 42, 43 – mosty, do potwierdzenia przez właściciela;
  - 46, 53 – praca dla grafika;
  - 49, 52 – woźnica i koń;
  - 51 – zadanie tuż obok bohatera, nagroda podana z góry.

## Stałe zasady
- Nie wpisywać nazw modeli AI w commity. Każdy commit z podpisem Co-Authored-By i linkiem do sesji.
- Zmiany w bazie, o które konektor Supabase prosi o zgodę, czekają na potwierdzenie właściciela (np. `docs/sql/quizy-admin.sql`).
- Nie prosić o hasła ani klucze; hasło admina zmienia się w panelu.
