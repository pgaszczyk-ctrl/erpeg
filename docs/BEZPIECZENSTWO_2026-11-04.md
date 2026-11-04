# Bezpieczeństwo Exp-lore — 4 listopada 2026

Zakres: stara gra `pgaszczyk-ctrl/erpeg`, źródła i aktualne definicje/uprawnienia Supabase. Nowe repo `exp-lore` jest odrębnym projektem. Nie zmieniano zapisów rzeczywistych graczy.

## Gotowe poprawki kodu

- `src/google.ts`: błąd z adresu jest tekstem, nie HTML. Usunięto potwierdzony XSS. Fragment adresu z tokenami oraz link weryfikacyjny są usuwane z bieżącej historii. Odzyskiwanie hasła nadal działa.
- Wylogowanie konta usuwa lokalną sesję i wysyła żądanie unieważnienia bieżącej sesji Supabase (`scope=local`). Przy braku sieci zadziała tylko wylogowanie lokalne; token dostępu pozostaje ważny do wygaśnięcia. Nie jest to pełna migracja OAuth do PKCE.
- `src/admin/admin.ts`: główne hasło nie jest zapisywane ani odczytywane z sessionStorage. Dawny wpis jest usuwany. Po odświeżeniu panel wymaga ponownego wpisania hasła.
- Vite 8.3.1 → 8.3.5, source-map-js 1.2.1 → 1.2.2, aktualizacja lockfile. Końcowy npm audit: zero znanych podatności.
- `.gitignore` blokuje typowe pliki środowiskowe oraz klucze prywatne. To nie usuwa plików już wcześniej śledzonych przez Git.

Poprawki mogą być opublikowane na TEST zgodnie z AGENTS.md. Produkcja pozostaje przy dotychczasowym pinie i patchach do jawnej zgody na wydanie. Draft hotfixu: `docs/poprawki/2026-11-04-bezpieczenstwo-logowania.patch`.

## Konkretna migracja bazy do zatwierdzenia

`docs/sql/security-hardening.sql` oraz `docs/sql/security-hardening-test.sql`:

1. Nowa kolumna określa ważność tokenu postaci: siedem dni od utworzenia/wymiany tokenu. Obecne sesje dostają siedem dni od migracji; nie ma masowego natychmiastowego wylogowania. Logowanie/odrodzenie wystawiające nowy token odnawia termin. Zamknięta sesja nie jest akceptowana.
2. Nowa funkcja `port_answers_secure(p_token)` odczytuje odpowiedzi wyłącznie postaci należącej do tokenu.
3. Dawna funkcja `port_answers(p_player)` zwraca pustą listę zamiast ujawniać zgłoszenia po imieniu. Nie usuwa zgłoszeń. Stary klient nie pokaże historii odpowiedzi do czasu aktualizacji klienta.
4. Wewnętrzny trigger i funkcja odczytu tokenu nie są wywoływalne przez anon/authenticated. RLS tabeli players pozostaje włączone bez polityk.

Dostosowanie klienta jest przygotowane osobno w `docs/poprawki/2026-11-04-porty-sesja.patch`. Nie włączono go przed udostępnieniem nowego RPC, aby nie psuć obecnego klienta.

Pierwsza próba wdrożenia szerszej migracji została odrzucona przez automatyczny przegląd: działająca baza, zmiany funkcji sesji i uprawnień oraz zbyt szeroka zmiana search_path. Ta operacja niczego nie wdrożyła. Usunięto zbiorczą zmianę search_path. Zawężony plik oczekuje zgody; nie próbowano obejść odmowy.

Migracja przeszła lokalny PostgreSQL/WASM (PGlite), z prawdziwym rozszerzeniem pgcrypto i rolą anon, na pustym schemacie odwzorowującym istotne kolumny. Testuje odczyt własny/cudzy, błędny/wygasły/zamknięty token, odnowienie tokenu i idempotencję migracji. Wszystkie sztuczne wiersze są wycofywane. Nie jest to test wydajności ani kopia produkcyjnej bazy.

## Weryfikacja

- `npm run build`: mapy, TypeScript i Vite — poprawnie, także po scaleniu aktualnego TEST.
- Osobny `npx vite build` + Vite preview.
- `scripts/tests/browser-security.mjs`: rzeczywiste funkcje auth na izolowanej stronie, PC i telefon 390×844; XSS, czyszczenie URL, odzyskiwanie hasła, unieważnianie sesji — poprawnie.
- `scripts/tests/browser-security-build.mjs`: rzeczywiste zbudowane strony, PC i telefon; XSS, formularz odzyskiwania, usunięcie dawnego hasła admina i menu gry — poprawnie. Zewnętrzne usługi są zastąpione sztucznymi odpowiedziami. Zrzuty lokalnie w work/security.
- `scripts/tests/security-database.cjs`: lokalna migracja SQL, rola anon, izolacja zgłoszeń, siedmiodniowy termin i odnowienie — poprawnie, również po powtórnym wykonaniu migracji.
- Draft hotfixu logowania przechodzi próbę zastosowania do plików przypiętej produkcji. Pełna publikacja wymaga osobnej zgody i zachowania istniejących patchy.
- Gitleaks 8.30.1: 833 commity we wszystkich lokalnie dostępnych refs, około 30 MB tekstu historii. Pięć wskazań; każde sprawdzono i każde dotyczy klucza `sb_publishable_`, przeznaczonego do klienta. Brak potwierdzonego prywatnego sekretu w tym skanie. Wartości nie trafiły do raportu. To nie dowodzi braku sekretów we wszystkich binariach, załącznikach i systemach zewnętrznych.
- Pozostaje istniejące ostrzeżenie builda o nierozwiązanej ścieżce ComicNeue-Bold.ttf; nie blokuje kompilacji.

## Ustawienia wymagające działania właściciela

### GitHub

1. `Settings → General → Danger Zone → Change repository visibility`: **Private**. Najpierw sprawdź utrzymanie Pages z prywatnego repo w swoim planie. Jeżeli plan tego nie obsługuje, przenieś hosting zbudowanej gry np. do Cloudflare Pages z prywatnym źródłem. Nie przełączaj na prywatne kosztem nieświadomego wyłączenia gry.
2. `Settings → Collaborators`: pozostaw tylko potrzebne osoby i aplikacje. Na koncie włącz uwierzytelnianie dwuskładnikowe lub passkey, zachowaj kody odzyskiwania poza repo.
3. Jeśli plan pozwala: `Settings → Rules → Rulesets` — blokada force-push/usuwania gałęzi produkcyjnej i TEST, wymagane przeglądy oraz właściwe testy. Nie ustawiaj w ciemno nazw checków, których repo nie uruchamia.
4. Utrzymuj klucze Cloudflare/R2/Drive wyłącznie w Secrets; uprawnienia ogranicz do potrzebnych zasobów. Nie ma podstaw do rotowania samego klucza publishable tylko dlatego, że jest publiczny.

### Supabase

1. Włącz ochronę haseł znanych z wycieków w ustawieniach bezpieczeństwa Auth, jeśli dostępna w planie. Doradca zgłasza obecnie jej wyłączenie. Źródło: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
2. W URL Configuration pozostaw tylko rzeczywiście używane adresy powrotu. Obecny kod wraca do `https://exp-lore.app/?google=1` oraz `https://exp-lore.app/test/?google=1`; po rozdzieleniu TEST zmień też konfigurację aplikacji. Unikaj niepotrzebnego wildcard dla wszystkich subdomen. Weryfikuj logowanie Google oraz link odzyskiwania po zmianie listy.
3. Sprawdź limity Auth i ochronę rejestracji przed automatami. Limity Auth **nie zabezpieczają automatycznie własnych RPC** `login` i `create_character` — te potrzebują osobnej implementacji.
4. Sprawdź dostępność kopii zapasowych oraz możliwość odtworzenia. Nie włączano płatnych usług i nie zmieniano planu.
5. Utwórz osobny projekt testowy, gdy zaakceptujesz ewentualny koszt. Nie kopiuj do niego prawdziwych kont i danych graczy.

### Cloudflare / hosting

1. Oddzielny origin TEST, np. `test.exp-lore.app`, i dodatkowo osobna baza. Sam katalog `/test/` nie izoluje localStorage ani sesji.
2. Panel admina docelowo na osobnym origin, chroniony Cloudflare Access z dostępem tylko dla wskazanych kont i MFA. Sama ochrona adresu panelu nie zabezpiecza bezpośrednio RPC Supabase.
3. Nagłówki odpowiedzi: dopasowana Content-Security-Policy, `X-Content-Type-Options: nosniff`, Referrer-Policy oraz po sprawdzeniu HTTPS HSTS. CSP najpierw w Report-Only i po testach WebGL, workerów, fontów, audio i logowania. Nie wyłączaj w ciemno CORS potrzebnego mapom. `frame-ancestors` wymaga nagłówka HTTP, nie meta HTML.

## Nadal otwarte — potrzebny kod, nie przełącznik w ustawieniach

- `save_game` przyjmuje od klienta monety, diamenty, sprzęt i XP. RLS nie dowodzi legalnego pochodzenia tych wartości. Wymagane serwerowe rozliczanie zakupów, wydatków i nagród, kontrola równoległych zapisów; przed płatnościami lub handlem.
- Arena przyjmuje deklarowany wynik i parametry ducha. Potrzebna walidowana symulacja/rozstrzygnięcie serwerowe. Limity czasu/biletów nie zapewniają uczciwego wyniku.
- Wywołania zgłoszeń i tworzenia postaci wymagają potwierdzania tożsamości, ograniczeń rozmiaru i limitów po stronie wejścia do API. Ochrona domeny gry nie osłania bezpośredniego adresu Supabase.
- Kod postaci nadal jest alternatywnym kluczem dostępu także po przypięciu do konta; potrzebne zasady wymiany/odzyskiwania oraz limity prób.
- OAuth powinien przejść na sprawdzony przepływ PKCE z powiązaniem żądania i odpowiedzi. Naprawa XSS nie oznacza, że cały auth został przebudowany.
- Nieopublikowane misje są pobierane przez `game_content(p_all:true)` i filtrowane u klienta. Publikację trzeba wymuszać w API.
- Globalny licznik złych haseł admina umożliwia blokowanie mu wejścia. Docelowo indywidualne konta admina, MFA i limity według źródła.

Nie deklarujemy pełnego zabezpieczenia gry. Prywatne źródła ograniczą kopiowanie implementacji, lecz pliki JS, modele i obrazy wysłane do przeglądarki pozostają możliwe do pobrania. Minifikacja i brak map źródłowych nie zastępują kontroli serwera.
