# Strona o grze – exp-lore.app/news

Strona leży w `public/news/`. Adresy: https://exp-lore.app/news/ (produkcja) i https://exp-lore.app/test/news/ (serwer testowy). Stary adres /welcome przekierowuje na /news.
Na tej stronie są też: **logo** gry i **polityka prywatności** (`prywatnosc.html` + angielska `privacy.html`) – Google wymaga obu adresów przy logowaniu przez Google.
Teraz stoi tam tylko strona zastępcza; prawdziwą robi ChatGPT na podstawie tego opisu i zrzutów z `public/news/zrzuty/` i szkicu polityki prywatności z `docs/polityka-prywatnosci.md`.

---

## Polecenie dla ChatGPT (wklej całość razem ze zrzutami)

Zrób stronę internetową o grze **Exp-lore** – coś w rodzaju strony gry na Steamie / strony projektu: ma zachęcić do zagrania i opowiedzieć, czym jest gra i skąd się wzięła.

### Wymagania techniczne
- Jeden plik `index.html` (CSS i JS w środku albo w osobnych plikach obok). Zwykłe pliki, bez Reacta i bez budowania.
- Zrzuty ekranu leżą obok strony w folderze `zrzuty/` – odwołuj się do nich **ścieżkami względnymi**, np. `zrzuty/01-stare-miasto.jpg` (nie `/zrzuty/...`), bo strona działa też pod `/test/news/`.
- Przyciski do gry muszą prowadzić dokładnie pod te adresy:
  - `../#nowa` – „Zagraj teraz” / tworzenie nowej postaci (główny przycisk, kilka razy na stronie),
  - `../#konto` – „Zaloguj się” (konto e-mail lub Google, lista postaci),
  - `../#wczytaj` – „Mam kod postaci”.
- Najpierw telefon (większość graczy gra na komórce), potem komputer. Szybka, lekka strona; czcionki tylko z Google Fonts.
- Dwa języki: polski (domyślny) i angielski – przełącznik PL / EN w rogu; wybór zapamiętany w przeglądarce (localStorage `exp-language`, wartości `pl`/`en` – ten sam klucz czyta gra).
- Pliki: `index.html` (strona), `prywatnosc.html` (polityka prywatności PL), `privacy.html` (EN), `logo.png` (logo gry – 512×512, przezroczyste tło; wymagane przez Google przy ekranie logowania), opcjonalnie `og.jpg` 1200×630 do podglądu linku w komunikatorach.
- W stopce każdej strony: link do polityki prywatności, kontakt (adres e-mail z polityki), „Mapy: © OpenStreetMap contributors”, „Pogoda: MET Norway”.

### Wygląd
- Klimat: lekki, bajkowy steampunk na współczesnym mieście – mosiądz, para, latarnie gazowe, stary pergamin, mapy. Ciepłe, stonowane kolory; ciemne tło `#1e1a24` (kolor obrysów postaci w grze) i złoto `#e0b44c` pasują do menu gry.
- Logo w grze to pikselowy napis „EXP-LORE” (złoto-pomarańczowy). Na stronie może być pikselowa czcionka w nagłówkach (np. „Press Start 2P” albo „VT323”), a zwykła czytelna w tekście.
- Duża galeria zrzutów (przewijana palcem na telefonie, powiększenie po kliknięciu).

### Co napisać na stronie (treść – można przeredagować, ale bez zmyślania funkcji)
**Hasło:** Przygoda na prawdziwej mapie Twojego miasta.

**Czym jest Exp-lore**
- Gra przygodowa w przeglądarce – bez instalowania, działa na telefonie i komputerze.
- Grasz na **prawdziwej mapie Lublina** i okolic (Jastków, Garbów, Nałęczów, Motycz): prawdziwe ulice, budynki, parki, lasy, rzeki – z danych OpenStreetMap. Każdy sklep, szkoła, kościół, biblioteka czy stacja w grze stoi tam, gdzie naprawdę.
- Dalej jest cała Polska i świat na uproszczonej mapie – z górami, szczytami i szlakami. Między miastami jeździ się wozem konnym albo pociągiem dalekobieżnym.
- **Mgła wojny**: nieznany świat przykrywa stary pergamin, a odkrywasz go, chodząc. Widzisz tylko to, co bohater ma przed oczami – budynki zasłaniają widok.

**Świat i fabuła**
- Współczesne miasto z nutą bajkowego steampunku. Przelatująca kometa sprawiła, że smoki zdziczały, driady stały się złośliwe, a chochliki zbiły się w gangi.
- Główny wątek „Cień smoka”: pewnego dnia nad bohaterem przelatuje cień smoka… Mag Albrecht pomoże go odnaleźć, a na końcu sam wybierasz: **walka** (tytuł „Pogromca smoka”) albo **rozmowa i melodia smoków** („Brat smoków”).
- Na mapie czekają gangi potworów z hersztem, wodniki w deszczu, bandyci nocą i smoki ziejące ogniem.

**Co się robi w grze**
- Walka mieczem, łukiem i magią; umiejętności rosną od ćwiczenia (także na kukłach treningowych na boiskach).
- Zadania z kościołów, urzędów i komisariatów (listy gończe), wyprawy dla bibliotek do okolicznych wsi, prośby mieszkańców, którym chochliki coś ukradły.
- Postacie z charakterem: pies szukający świnki, siostra Margo, babcia Grażynka z Garbowa, Luigi z zagadkami szachowymi…
- **Szkoły dają quizy**, mądrale na ulicach zadają zagadki „z życia” – gra uczy przy okazji (poziom pytań dobierany do wieku).
- Zbieranie owoców z drzew, grzybów i drewna w lasach, warzyw na działkach; sprzedaż w sklepach, lokaty w banku, mikstury u alchemika na stacji benzynowej, noclegi w hotelach i pod namiotem.
- **Prawdziwa pogoda**: w grze pada, kiedy pada za oknem (prognoza MET Norway), a noc zapada o prawdziwym zachodzie słońca.

**Dla kogo**
- Dla dzieci i dorosłych: pięć poziomów trudności, od „Dziecięcego” (domyślny, łagodny) do „Hardkoru”.
- Śmierć postaci jest ostateczna – jej imię trafia na Tablicę Pamięci (pierwsze wskrzeszenie jest darmowe).
- Bez hasła: postać ma imię i 8-znakowy kod; można ją też przypisać do konta e-mail lub Google.

**Gazeta „Kurier Parowy”**
- Na ulicach stoją gazeciarze: w gazecie są wieści o nowych zadaniach i zadaniach specjalnych, codzienne rankingi (kto przeszedł najwięcej kilometrów na świecie, w kraju i w mieście, kto zdobył pieczęcie), nowości w grze i plany, a także „List do redakcji” – gracz może opisać przygodę, którą chciałby przeżyć. Niektórzy gazeciarze proszą o pomoc w roznoszeniu gazet.

**O projekcie**
- Exp-lore (nazwa robocza) to rodzinny, niezależny projekt z Lublina, rozwijany na bieżąco – co kilka dni pojawiają się nowe rzeczy, a gracze zgłaszają błędy i pomysły prosto z gry („🐞 Znalazłem buga”).
- Grafiki postaci i świata rysuje grafik; mapy pochodzą z OpenStreetMap, pogoda z MET Norway.
- Wymagane podpisy na stronie (stopka): „Mapy: © OpenStreetMap contributors” oraz „Pogoda: MET Norway”.

### Zrzuty ekranu (folder `zrzuty/`)
Opisy w pliku `zrzuty/OPIS.txt` – użyj ich jako podpisów w galerii.

---

## Jak wgrać gotową stronę
Wyślij Claude pliki od ChatGPT (albo wklej kod). Claude wstawi je do `public/news/`, sprawdzi na telefonie i wyśle na serwer testowy.

---

## Polityka prywatności (dla ChatGPT)
Zrób z `docs/polityka-prywatnosci.md` dwie strony w tym samym wyglądzie co strona główna: `prywatnosc.html` (PL) i `privacy.html` (EN – tłumaczenie). **Nie dopisuj nic, czego nie ma w szkicu** (żadnych reklam, analityki, ciasteczek śledzących – gra ich nie ma). Pola w nawiasach kwadratowych uzupełnia właściciel.
