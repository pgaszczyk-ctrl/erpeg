

## 2026-10-29 — błąd pierwszej służby i zmiana postaci (zgłoszenie właściciela)

Zrzut pokazuje `canceling statement due to statement timeout` w oknie błędnie opisującym dobór miejsc. W kodzie źródłem tego błędu może być `save_game` przed planowaniem: `ensure` mapy nie wywołuje SQL. Dotychczas wspólny catch obwiniał mapę, `update` uruchamiał kolejne próby, a jawne ponowienie mogło ominąć niepotwierdzony zapis po ustawieniu originMapId w pamięci.

Poprawki: `PrologRekruta` rozdziela błąd zapisu od mapy, zatrzymuje grę na przygotowanie i błędy, czeka na jawne ponowienie oraz ponawia zapis tego samego miasta przed dalszym planowaniem. Nie uruchamia planowania pod zasłoną ładowania. `planner` wyklucza cel listu bliższy niż 55 m, aby posterunek przyjęcia nie był jednocześnie celem dostawy.

`ludzik3d`, `look`, `ui/menu`: wybór modelu nie zależy od rozpoczęcia prologu ani ukrytego modułowego wyglądu. Nowa jawna tożsamość `look.guard3d`; brak pola w dawnym zapisie oznacza dotychczas widocznego strażnika. Nowe postacie zapisują wylosowaną płeć strażnika od początku. Zmiana broni zachowuje bazową głowę, kapelusz ma odpowiedniego dawcę. Naprawia również dotychczasowe stare zapisy z ukrytą strażniczką i rozpoczętym prologiem przy następnym logowaniu; nie zmienia sprzętu ani etapów misji.

Regresje: browser-prolog wymusza dwa SQL timeouty zapisu startu i sprawdza brak lawiny ponowień, właściwy komunikat oraz kolejne jawne potwierdzenie. Stara postać z ukrytym kobiecym wyglądem zachowuje geometrię korpusu i głowy przy zapisaniu się do służby. Pełny przebieg obejmuje nadal łuk, loch, różdżkę, powroty i globalną jednorazowość. `test:prolog` dodaje przypadek rozpoczęcia na posterunku.

Weryfikacja: pełny lokalny VITE_TEST=1 npm run build (Lublin i 124 mapy miast, TypeScript, Vite), osobny Vite build/preview, test:prolog, test:quests, 600 planów lochów, planowanie na rzeczywistych mapach Lublina i Puław oraz pełne przejścia PC PL / emulowany telefon EN (po 24 zapisy) zakończone sukcesem. Recruit prologue checks 40883344553: wszystkie cztery warianty PL/EN × PC/telefon sukces. City quest checks 40883344499: pełny build, testy reguł i map oraz regresja przeglądarkowa istniejących questów — sukces. RPC w testach przeglądarkowych są atrapami; nie sprawdzano fizycznego telefonu. PR #41, sprawdzony kod c1d1f7b5aad3d87f48e81f60c65b8d046da1a685; publikacja automatyczna po scaleniu. Nie zmieniano SQL ani danych graczy; przyczyna przeciągającego się zapytania save_game nie została zdiagnozowana na serwerze (brak połączenia administracyjnego do bazy). Obsługa błędu po stronie klienta nie dowodzi usunięcia przyczyny SQL timeoutu.


Pełne pliki CLAUDE.md i PRZEKAZANIE_chatgpt.md nie są przesyłane: automatyczna kontrola odrzuciła publikację całej historii operacyjnej. Ta notatka obejmuje tylko bieżącą naprawę.
