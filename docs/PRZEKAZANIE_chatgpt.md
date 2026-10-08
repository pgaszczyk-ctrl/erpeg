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

## 2026-10-08 — zanikanie Targów przy ścianie i mruganie dekoracji

- Zgoda właściciela w czacie: sprawdzić niepotrzebne zanikanie Targów podczas podejścia oraz znikanie/mruganie rzeźby smoka przy chodzeniu. To osobny problem od wcześniej naprawionego braku zabytków po restarcie sceny.
- Odtworzono zanikanie w 65 dostępnych miejscach przy przednich ścianach hal. Punkt położenia bohatera wypadał kilka pikseli nad podstawą obrazu, choć rzeczywiste stopy były już przed nią. `src/map/Zabytki.ts` uwzględnia teraz przesunięcie stóp `8 × SKALA_POSTACI` zgodne z `fitHd`; obraz zostaje nieprzezroczysty i pod postacią.
- Dekoracje kopiowały kolejność rysowania i przezroczystość zabytku przed jego aktualizacją: przy zmianie kolejności mogły na jedną klatkę schować się pod dachem. Kopiowanie przeniesiono po aktualizacji budynku, w tej samej klatce; dotyczy rzeźby i trzech szyldów.
- Sprawdzone: `VITE_TEST=1 npm run build`, następnie `VITE_TEST=1 npx --no-install vite build`, działający Vite preview i Playwright 1280×900 oraz 390×844. W obu rozmiarach wszystkie 65 miejsc pozostaje nieprzezroczyste; faktyczny ruch klawiaturą, zgodność warstw z budynkiem w każdej obserwowanej klatce (275/262 klatki w pierwszej próbie), potrzebna przezroczystość zamku za ścianą, trzy zabytki i cztery dekoracje Targów po restarcie sceny, brak nieobsłużonych błędów JavaScript. Zrzuty przy ścianie i podczas chodzenia obejrzano; pomocniczy skrypt: `/workspace/onboarding-tools/check-targi-occlusion.mjs`, zrzuty `/workspace/onboarding-artifacts/*-targi-*-fixed.png` i `*-castle-behind-fixed.png`.
- Test używa zastępczego logowania/odpowiedzi Supabase; nie odczytuje ani nie zmienia prawdziwej postaci. Grafiki zabytków, geometria mapy, pliki produkcji i wersji oraz baza pozostają bez zmian. Pliki: `src/map/Zabytki.ts`, CLAUDE.md i ten dziennik.
- Praca była przerwana awarią uruchomienia środowiska; po zapisaniu i publikacji konfiguracji przez właściciela odzyskano dostęp do plików, Git i API GitHub. Nie wymagano dostępu do Supabase.

## 2026-10-08 — uwagi do stylu modułowych postaci v2

- Polecenie właściciela po zrzucie z gry: nowe postacie są „wyblakłe, wychudzone i bardzo nijakie”; grafik ma wrócić do stylu istniejących postaci.
- Zapisano pilną poprawkę w `docs/paczka-dla-artysty/ZAMOWIENIE_22_awatary_modulowe.md`: nasycenie i kontrast jak u obecnych bohaterów, pełniejsze sylwetki i krótkie szyje, czytelne twarze/stroje; konkretne wzory ranger/traveler/knight. Zachowano modułowe części i osobne punkty broda/szyja. Najpierw poprawiona próba dwóch głów i dwóch ciał, z porównaniem w tej samej skali, dopiero po akceptacji dalsze części.
- CLAUDE.md zawiera nową decyzję. Nie zmieniano grafik postaci ani ich kolorów w grze. Sprawdzono treść i ścieżki wzorów; dokumentacja nie zmienia działania aplikacji. Uwagi są zapisane w repozytorium, nie wysyłano wiadomości do zewnętrznego grafika.
- Pozostało: poprawione rysunki od grafika i ocena właściciela.
