# Błąd atob przy uruchamianiu produkcji po grze na teście

Stan: właściciel zatwierdził publikację poleceniem „Publikuj”. Sprawdzony szkic skopiowano bez zmian do `produkcja/1.038-mgla-zgodnosc.patch`; scalenie PR #45 uruchamia wydanie produkcji 1.038.

Produkcja 1.037 (`PRODUKCJA` + dotychczasowe łatki 1.036 i 1.037) czyta fragmenty odkrytej mapy przez `b64.dec(v)` w `Explored.load`. Test od 29 października zapisuje część fragmentów jako `~` + Base64 długości serii. Oba środowiska korzystają z tych samych zapisów. `~AIAg` oznacza poprawny, całkowicie odkryty fragment, ale stary odczyt rzuca `InvalidCharacterError`, który trafia do komunikatu „Nie udało się przygotować mapy”. Błąd odtworzono na rzeczywistym kodzie `Explored.load` produkcji.

`1.038-mgla-zgodnosc.patch` jest szkicem małej łatki do zastosowania po obecnych łatkach produkcyjnych. Nie jest w `produkcja/`, więc push tej pracy nie publikuje wydania. Po wyraźnym poleceniu wydania: sprawdzić ponownie bieżący `PRODUKCJA`, listę i wersje łatek, a następnie przenieść sprawdzony szkic do `produkcja/` i wykonać zwykłe wdrożenie. Nie przenosić całego testa.

Zakres łatki:

- odczyt nowego i starego formatu przez ten sam `dekodujKawalek`, który działa na teście;
- nowy plik `src/map/mglaZapis.ts` identyczny z bieżącym testem;
- produkcyjny zapis nadal zapisuje stary format, ograniczając zakres awaryjnej poprawki do odczytu;
- numer wydania produkcji 1.038 w samej łatce;
- bez SQL, migracji lub kasowania zapisów graczy.

Test regresji `scripts/tests/browser-fog-compat.mjs` loguje fikcyjną postać przez przechwycone RPC (brak połączeń z zapisem graczy). Mieszany zapis zawiera odkryty fragment `~AIAg` i stary fragment z jednym odkrytym polem. Test sprawdza rzeczywisty start gry i zachowanie obu fragmentów na komputerze i pionowym telefonie 390×844. `EXPECT_BROKEN=1` pozwala sprawdzić stary błąd na wcześniejszym buildzie. Uruchomienie: `PORT=4175 node scripts/tests/browser-fog-compat.mjs` (Playwright dostępny w NODE_PATH lub node_modules).

Sprawdzone przed przeglądarką: odtworzenie wyjątku na produkcyjnym `Explored.load`, poprawny odczyt mieszanych i uszkodzonych fragmentów po poprawce, zapis/ponowny odczyt bez utraty odkrytych pól, 4000 przypadków testu kodeka, `git apply --cached --check` szkicu na odtworzonej produkcji 1.037.

Pełne `npm run build` odtworzonej produkcji z poprawką przeszło (124 mapy miast, TypeScript, Vite); osobne `npx tsc --noEmit && npx vite build` również. Lokalnego Playwrighta nie udało się uruchomić: brak Chromium, instalator pobierał niepoprawne archiwum, a instalacja pakietu systemowego nie była możliwa. Test przeglądarkowy przeniesiono do `.github/workflows/fog-compat-checks.yml`: odtwarza produkcję i stosuje szkic wyłącznie na runnerze, korzysta z opublikowanych map i atrap RPC, nie publikuje gry.

Potwierdzone CI: https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/41011858417 — test PC i telefonu zakończony sukcesem, bez błędów JS; oba formaty zachowały sprawdzane odkryte pola. Zrzuty after-desktop.png i after-phone.png pobrano i obejrzano: mapa pokazana, brak komunikatu atob. Test używa fikcyjnego logowania, bez zmian zapisów graczy i bez próby na fizycznym urządzeniu. Produkcja nadal niewydana.
