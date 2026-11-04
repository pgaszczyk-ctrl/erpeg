# Drugi język aplikacji — ocena z 9 października 2026

Właściciel chce drugi język całej aplikacji, wybierany w ustawieniach gracza.
Przy tworzeniu postaci domyślna propozycja ma wynikać z języka urządzenia.
Poniższa ocena przyjmuje polski i angielski, bo te dwa języki już są w kodzie;
docelowy drugi język trzeba potwierdzić przed wykonaniem tłumaczeń.

## Co już działa

- `src/i18n.ts`: `pl`/`en`, odczyt języków urządzenia, wymuszenie przez
  `?lang=pl|en`, odczyt tekstów `{ pl, en }` przez `tr()` i par przez `tx()`.
- Dwujęzyczne są głównie stałe postacie (`content/postacie.ts`,
  `scenes/FixedNpcs.ts`) oraz fragmenty menu, opisy wczytywania, ostrzeżenie
  przed wyjściem i część dawnych ustawień wyglądu.
- Gra nie ma jeszcze zapamiętanego wyboru języka gracza ani jego ustawienia
  w formularzu tworzenia postaci. `lang` jest stałą ustalaną przy starcie.

## Co wymaga pracy

1. **Wybór i zapamiętanie języka.** Przy nowej postaci propozycja z urządzenia;
   później pierwszeństwo ma wybór gracza, także po ponownym wczytaniu na innym
   urządzeniu. W ustawieniach łatwo dostępna zmiana. Dziś `detect()` wybiera
   polski, jeśli znajduje go gdziekolwiek na liście urządzenia — trzeba
   respektować kolejność preferowanych, obsługiwanych języków. Stałe, które
   już przy imporcie wywołują `tx()`, wymagają uwagi przy zmianie w trakcie gry.
2. **Okna i komunikaty.** Menu, konto, Kufer, HUD, mapa, sklepy, wytwórcy,
   naprawy, podróż, aparat, błędy, samouczek, nazwy i opisy przedmiotów,
   umiejętności, osiągnięcia, dialogi i komunikaty scen. Wiele z nich ma dziś
   polskie napisy wpisane bezpośrednio. Daty/liczby mają często `pl-PL` na stałe,
   a strona główna `lang="pl"`. Potrzebne są też odmiany i liczba mnoga.
3. **Historie i quizy.** Misje pochodzą z kodu, panelu/serwera i zapisanych
   losowych zleceń. Pytania pochodzą z kodu, generatorów rachunkowych i serwera.
   Muszą otrzymać wersje językowe bez zmiany identyfikatorów, postępu, wyborów
   i poprawnych odpowiedzi. Język gracza jest osobnym wyborem od kraju szkoły
   (`country` w quizach); np. angielski w Lublinie nie wyłącza pytań o Polskę.
4. **Panel i dalsze treści.** Formularze/prompt importu powinny umożliwiać
   podanie obu wersji, pokazywać braki i zachowywać zgodność starszych klientów.
   Nie tłumaczyć zewnętrznych nazw ulic, miejsc, imion graczy ani ich zgłoszeń.
   Napisy wypalone w grafikach wymagają osobnych obrazów albo tekstu nad obrazem.

## Zalecany podział

- Najpierw ustawienie języka oraz komplet najczęściej używanych okien.
- Następnie przedmioty, zadania, mieszkańcy i opowieści.
- Potem quizy, generatory treści, panel i kontrola kompletności tłumaczeń.

To znaczna praca rozłożona na kilka etapów, bez potrzeby przebudowy mapy,
grafiki świata czy mechaniki walki. Ostrożny szacunek dla pełnego PL/EN:
kilka dni pracy wraz z tłumaczeniem i kontrolami; termin zależy przede
wszystkim od zakresu treści na serwerze, których nie inwentaryzowano w bazie.
Nie przedstawiać pierwszego etapu jako całkowicie angielskiej gry.

Nie tłumaczyć na żywo przy każdej rozmowie ani zakupie: gotowe wersje mają
działać szybko, także przy słabym połączeniu. Zachować oryginalne treści i
postęp; przed zmianą Supabase obejrzeć tabele i zapisać SQL w `docs/sql/`.

Ta notatka jest oceną i planem. W tym zadaniu nie wdrożono nowego wyboru
języka ani zmian w Supabase. Zmieniono słownictwo świątyń w polskich tekstach.
