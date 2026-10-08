# Przekazanie projektu Exp-lore — ChatGPT

## 2026-10-08 — przygotowanie środowiska i przejęcie projektu

- Przeczytano AGENTS.md oraz całe CLAUDE.md. Utworzono lokalną gałąź `chatgpt/praca` z aktualnego `claude/bold-gauss-peehzd` (5fffceed59c43556784aec518068cb0b5f5b6364). Początkowo katalog był czysty.
- Cel: przygotować lokalne środowisko, sprawdzić budowanie i uruchomienie; następnie czekać na zadania właściciela.
- Kod gry, pliki produkcji, zależności zapisane w repozytorium i baza Supabase pozostają bez zmian. Nie wykonywano SQL ani nie logowano się na postacie graczy. Nie wysyłano zmian na GitHub.
- Zainstalowano zależności przez `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`. Wskazanie lokalnego katalogu pamięci podręcznej rozwiązało błąd dostępu do domyślnego katalogu npm; sprawdzanie integralności pakietów pozostało włączone.
- `VITE_TEST=1 npm run build` przeszło: dane mapy, sprawdzenie TypeScript i Vite. Pierwsze przygotowanie danych Lublina trwało około 9 minut (łączenie budynków i ulic); kolejne budowanie wykorzystało gotowe dane. Mapy i `.cache/` są ignorowane przez Git. Nie pobierano nowych danych OSM. To przygotowanie danych, a nie rysowanie świata wykonywane przez urządzenie gracza.
- Następnie `VITE_TEST=1 npx --no-install vite build` oraz `npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort` przeszły. Vite ostrzega o dużym pliku gry, ale kończy się powodzeniem.
- `node scripts/test-gen.mjs` przeszło. Playwright + systemowy Chromium: ekran wejścia, uruchomienie demo w Krakowie, faktyczny ruch postaci, otwarcie Kufra, brak nieobsłużonych błędów JavaScript; rozmiary 1280×900 i 390×844 (telefon: skala ekranu 2). Zrzuty obejrzano. Sprawdzenie rozmiaru telefonu nie zastępuje próby na fizycznym urządzeniu.
- Playwright i pomocniczy skrypt są poza repozytorium: `/workspace/onboarding-tools/check-erpeg.mjs`; zrzuty: `/workspace/onboarding-artifacts/` (`desktop-*`, `phone-*`). Test używa `data/world-sample/krakow.pmtiles`, lokalnych danych wysokości i zastępczych odpowiedzi Supabase; nie potwierdza prawdziwego logowania ani zapisu.
- Dostęp do Supabase, R2, danych wysokości i czcionek był blokowany przez reguły sieci (403 od pośrednika). W szkicu ustawień środowiska zapisano wymagane domeny: iiffchuhrhsjjgmstypx.supabase.co, pub-e885d1b5314941a1bc22df18bed8e25d.r2.dev, s3.amazonaws.com, fonts.googleapis.com, fonts.gstatic.com. Zapis szkicu nie aktywuje połączeń; potrzebny przegląd/zapis i publikacja środowiska przez właściciela.
- Zmieniony plik repozytorium: tylko ten dziennik. Nie dopisywano do CLAUDE.md: brak nowych faktów o działaniu gry.
- Pozostało: po aktywacji ustawień sieci sprawdzić połączenia; prawdziwe logowanie i zapis nie były testowane. Brak zmian gry do scalenia. Dziennik pozostawiono lokalnie do dołączenia przy kolejnej zatwierdzonej pracy.

## 2026-10-08 — poprawione awatary i smoki na serwer testowy

- Polecenie właściciela: podmienić awatary i wgrać nowe smoki z `22_awatary_v2.zip` i `23_smoki_proba_v2.zip` na serwer testowy.
- Podmieniono osiem dotychczasowych próbnych wariantów awatarów, zachowując ich kolejność, identyfikatory i kolory. Nowe dwie głowy i dwa tułowie mają poprawione maski oraz różne wysokości ciała. Składanie korzysta z osobnych punktów `broda`/`szyja` w każdej klatce, zamiast dawnego opuszczania głowy o 3 px; stara łatka maski włosów została usunięta. Dwa warianty w kolorach podstawowych są piksel w piksel zgodne z podglądami grafika.
- Podmieniono próbne smoki leśnego i trującego. Każdy ma dwie nowe klatki z boku, z których dotychczasowy skrypt tworzy arkusz stania, chodzenia, ugryzienia i śmierci. Skala i punkt stóp pozostają bez zmian, różowe tło usunięte; punkt pyska dopasowano do nowych sylwetek.
- Pliki: `scripts/awatary-sklad.py`, źródła i dokumentacja w `scripts/awatary-zrodla/`, osiem `public/postacie/sklad_*.png`, `scripts/smoki-nowe.py`, cztery próbki i opis paczki w `scripts/smoki-zrodla/paczka_ssd/v3/`, `public/swiat/smoki/smok_lesny.png` i `smok_trujacy.png`, `src/content/wyglad.ts`, `src/content/smoki.ts`, CLAUDE.md i ten dziennik.
- Produkcja: PRODUKCJA, WERSJA w src/version.ts i produkcja/ nietknięte. Nie wykonywano zmian w Supabase ani SQL.
- Pozostało od grafika: pełne animacje smoków i kolejne części awatarów. Ta zmiana podmienia obecne próbne warianty; nie dodaje nowego edytora osobnych głów, ciał i kolorów.
- Sprawdzone: `VITE_TEST=1 npm run build`, potem `VITE_TEST=1 npx --no-install vite build` i działający Vite preview. Playwright przeszedł w rozmiarach 1280×900 i 390×844: ekran wejścia, demo, ruch, Kufer, wszystkie osiem awatarów oraz oba smoki z widoczną grafiką i cieniem; brak nieobsłużonych błędów JavaScript. Zrzuty obejrzano, są w `/workspace/onboarding-artifacts/` (`*-avatar-*`, `*-dragon-*`). Sprawdzono rozmiary arkuszy, twardą przezroczystość awatarów, brak różowego tła smoków i zgodność dwóch podstawowych awatarów z podglądami grafika.
- Próby smoków początkowo odbywały się w strefie bezpieczeństwa demo albo poza aktualnym polem widzenia; poprawiono lokalny scenariusz sprawdzenia, bez zmian gry. Końcowe sprawdzenie wymaga rzeczywistej widoczności grafiki i cienia. Użyto lokalnej próbki mapy i zastępczych odpowiedzi Supabase; dane graczy nie były używane.
- Środowisko blokuje bezpośrednie odczytanie `exp-lore.app` i API GitHub (403 od pośrednika). Dopisano `exp-lore.app` oraz `api.github.com` do szkicu dostępu do sieci, zachowując poprzednie domeny. Bez aktywacji ustawień nie można potwierdzić zakończenia publikacji na stronie; wysłanie gałęzi Git jest osobnym sprawdzeniem.

## 2026-10-08 — indywidualne budynki znikające po powrocie

- Właściciel pokazał zwykły dach zamiast indywidualnej grafiki Targów Lublin. Porównanie wcześniejszej zmiany potwierdziło, że nie zmieniono plików Targów, danych mapy ani kodu budynków. Poprzednie sprawdzenie awatarów i smoków nie obejmowało zabytków.
- Odtworzono istniejący w przejętej wersji błąd: pierwsze uruchomienie sceny ma trzy indywidualne budynki, ponowne uruchomienie ma zero, mimo obecności ich obrazów w pamięci. Podczas create() scena nie jest jeszcze aktywna; sprawdzenie w postaw() odrzucało natychmiastowe umieszczenie gotowego obrazu.
- Poprawka: `src/map/Zabytki.ts` czeka na zdarzenie CREATE przed umieszczeniem obrazu znajdującego się już w pamięci. Zachowano sprawdzenie aktywności przy pobieraniu obrazu; grafika, wygląd świata i dane mapy bez zmian.
- Dokumentacja: CLAUDE.md i ten dziennik. Produkcja, wersja i Supabase nietknięte.
- Sprawdzone: `VITE_TEST=1 npm run build`, następnie `VITE_TEST=1 npx --no-install vite build`, Vite preview oraz Playwright (1280×900 i 390×844). Przy pierwszym wejściu i po restarcie sceny są wszystkie trzy indywidualne budynki; test wymaga widoczności Targów. Zrzuty `*-targi-1.png` obejrzano. Sprawdzenie używa zastępczego logowania i nie dotyka prawdziwej postaci ani bazy.
