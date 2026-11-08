ID: GEM-001
Od: Gemini (doradca, przez scripts/gemini.mjs, model gemini-3.5-flash)
Do: właściciel, Claude
Status: nowe
Akceptacja: czeka na właściciela
Dotyczy: kolejność planów z gazety (PLANY w src/content/gazeta.ts)

## Pytanie
Kontekst: Exp-lore to darmowa gra przeglądarkowa (telefon przede wszystkim) na prawdziwej mapie świata, start w Lublinie. Ok. 100 postaci w bazie, gra wciąż się rozwija; nowi gracze wchodzą głównie przez demo z kodu QR (ulotki). Jest: walka na żywo, łowiska, lochy, misje wieloetapowe (głównie Lublin), sklepy, górnictwo, podróże (woźnice, pociągi, promy, armaty), gazeta „Kurier Parowy” z rankingami i łamigłówką dnia, tablice ogłoszeń z kartkami zadań. Duża część tekstów tylko po polsku. Grafikę robi zewnętrzny artysta (zamówienia trwają dni–tygodnie). Właściciel nie programuje, programuje Claude.

Lista planów pokazywana graczom w gazecie:
1. Diamentowa ochrona – diamenty po porażce ratują złoto z plecaka i doświadczenie (dziś porażka = szpital, utrata złota z plecaka i połowy EXP ponad próg poziomu).
2. Gazeciarz z prawdziwego zdarzenia – nowe rysunki gazeciarzy (czeka na artystę).
3. Smoki w pełnej krasie – nowe rysunki smoka leśnego i trującego (artysta).
4. Zabytki Lublina – Nowy Ratusz, Archikatedra (artysta + osadzenie w mapie).
5. Więcej przygód – nowe ręcznie pisane historie, także z listów graczy.
6. Gra po angielsku – cała gra w dwóch językach z wyborem przy tworzeniu postaci.

Zadanie: ułóż kolejność (co najpierw), uzasadnij krótko z punktu widzenia: zatrzymania nowych graczy, ryzyka, kosztu i zależności od artysty. Wskaż, czego na tej liście brakuje, a co dałoby więcej (max 3 propozycje). Wskaż ryzyka (np. diamenty a płatności/ekonomia). Odpowiedź max ~350 słów, w punktach.

## Odpowiedź Gemini

Oto rekomendowana kolejność prac, propozycje poprawek oraz analiza ryzyk dla projektu *Exp-lore*.

### 1. Rekomendowana kolejność (co najpierw)

1. **[1] Diamentowa ochrona (i ogólne złagodzenie kary za śmierć):** 
   * *Dlaczego:* Nowy gracz z kodów QR zderza się z brutalną karą (strata 50% EXP i złota). To główny powód porzucania gry na starcie (*churn*).
2. **[5] Więcej przygód (Lublin i okolice):** 
   * *Dlaczego:* Treść zatrzymuje graczy z ulotek. **Zero zależności od artysty** – Claude może od razu pisać i kodować nowe zadania.
3. **[4] Zabytki Lublina (Ratusz, Katedra):** 
   * *Dlaczego:* Buduje lokalny klimat dla graczy z QR. Technicznie gotowe zadania można przygotować na "zastępczych" grafikach (placeholderach) i podmienić po dostawie od artysty.
4. **[3 i 2] Grafiki Smoków i Gazeciarza:** 
   * *Dlaczego:* To tylko szlif wizualny. Sam rysunek nie zatrzyma gracza na dłużej. Przyjmować i wdrażać wyłącznie wtedy, gdy artysta je przyszle.
5. **[6] Gra po angielsku:** 
   * *Najniższy priorytet:* Gracze przychodzą z lokalnych ulotek w Lublinie. Tłumaczenie teraz przedwcześnie podwoi czas i koszt pisania każdego nowego questa przez Claude'a.

---

### 2. Czego brakuje na liście? (Top 3 propozycje o wysokim wpływie)

1. **Dedykowany Samouczek Startowy (FTUE):** Prowadzenie gracza "za rękę" przez pierwsze 3 minuty od skanowania QR (odbiór pierwszej przesyłki w Lublinie, prosta walka, użycie gazety).
2. **Ślady innych graczy na mapie:** Przy ~100 graczach świat bywa pusty. Dodajcie widoczność "duszków" innych graczy lub ich ostatnich wpisów na tablicach, by mapa żyła.
3. **Zapis do powiadomień (PWA / E-mail):** Mobilny gracz przeglądarkowy łatwo zapomina o grze. Przypomnienia o nowym wydaniu "Kuriera Parowego" zwiększą powracalność.

---

### 3. Główne ryzyka

* **Diamenty a P2W (Pay-to-Win):** Jeśli diamenty będą głównie płatne, gracze uzna gra za "Pay-to-Not-Suffer" (płać, by nie tracić postępu). *Rekomendacja:* Skasujcie karę EXP dla poziomów 1–10 całkowicie, a diamenty niech chronią tylko złoto lub działają od wyższych poziomów.
* **Wąskie gardło grafika:** Projekt staje, gdy czekacie tygodniami na artystę. *Zasada dla Claude'a:* Najpierw wdrażać działającą mechanikę na ikonie tymczasowej, grafika wchodzi na koniec.

## Uwagi Claude'a (fakty, których Gemini nie znał)
- Samouczek startowy już jest: demo z QR (imię → sen → smok → pobudka przy Targach) i samouczek po starcie (SamouczekStartu). Lepiej mierzyć, gdzie gracze odpadają, niż budować kolejny.
- Angielski nie jest „od zera”: postacie stałe, gazeta, lochy, prolog i nowe historie (Czarci Wyrok) są już PL/EN. Brakuje głównie HUD/sklepów/starych misji – koszt średni, nie gigantyczny.
- Diamenty mają już źródło: bank (1 000 000 monet) i nagrody dla wspierających. Zgadzam się z ryzykiem pay-to-win – ochrona powinna być do zdobycia też grą.
- Powiadomienia na telefon wymagają service workera (dziś go nie ma), a na iPhonie działają tylko w zainstalowanej aplikacji – wykonalne, ale osobny projekt.
