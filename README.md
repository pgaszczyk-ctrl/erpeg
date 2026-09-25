# Erpeg

Prosta gra RPG z widokiem z góry, w stylu Zeldy i Tibii z lat 90. Działa w przeglądarce, na komputerze i na telefonie.

## Jak grać

- **Komputer:** WASD albo strzałki to ruch, SPACJA (albo J, Enter albo kliknięcie myszą) to cios mieczem.
- **Telefon:** lewa połowa ekranu działa jak joystick (połóż kciuk i przesuń), prawa połowa to cios mieczem.

Pokonane glutki zostawiają monety albo serduszka (serduszko leczy).

## Co jest w grze

- Mapa prawdziwego Lublina z OpenStreetMap: budynki z adresami, ulice, chodniki, Bystrzyca, parki i lasy. Nie da się wejść w budynki ani do wody, a przez most przejdziesz.
- Bohater zaczyna w losowym miejscu miasta.
- Budynki z misjami mają złote dachy i znak „!” nad wejściem. Wejdź w drzwi, żeby porozmawiać.
- Mgła wojny: jasno widać tylko to, w którą stronę patrzy bohater (przez budynki nie widać), szaro to, co już widział, a czarno miejsca, gdzie jeszcze nie był.
- 🗺 w prawym górnym rogu (albo klawisz M) otwiera mapkę okolicy.
- Cel misji jest wypisany u góry ekranu, a złota strzałka pokazuje, dokąd iść.
- Na start tworzysz postać (imię, hasło, adres startowy) i dostajesz 6-znakowy IDIK. Żeby wczytać postać, podajesz imię, hasło i IDIK.
- Gra zapisuje się po wejściu do budynku z misją i po ukończeniu misji.
- Śmierć jest ostateczna: postać trafia na Tablicę Pamięci razem ze zdobytym doświadczeniem (EXP).
- Z gry wychodzisz przez ☰ w lewym górnym rogu → „Wyjdź” (nie da się tego zrobić w trakcie walki). Jeśli zamkniesz okno bez wyjścia, postać zostaje bezbronna na ulicy przez 10 sekund.

- Sklepy (niebieskie dachy, szyld z mieczem) w prawdziwych Biedronkach, Lidlach i Lewiatanach sprzedają lepsze miecze. Szkoły (czerwone dachy, szyld z książką) uczą walki mieczem: dłuższy zamach, a potem szybsze cięcia.
- Kościoły (fioletowe dachy) i urzędy (szare) dają losowe zlecenia, a przy każdym uruchomieniu gry czeka tam nowe. Komendy policji (granatowe) dają listy gończe: złoczyńca ukryty gdzieś w okolicy albo wielki glut. Szpitale (białe) leczą za darmo.
- Na działkach, trawnikach i w parkach rosną jabłonie, śliwy i winorośl. Uderzenie mieczem strąca owoc (2–5 z drzewa), a owoce sprzedaje się w sklepie. Drzewa odrastają przy każdym uruchomieniu gry.
- W wąskich uliczkach i na ścieżkach czają się wrogowie (do 20 na kilometr kwadratowy). Chodzą grupkami: gdy jeden zacznie gonić, dołączają sąsiedzi.
- Postać zaczyna jako wojownik z kijkiem. Dotknięcie lub klik to atak bronią z ręki. Przytrzymanie i wycelowanie (przesunięcie palca albo myszka) to strzał z łuku albo zaklęcie.
- Łuk i zbroje kupuje się w sklepach. W bibliotece (zielony dach) można nauczyć się magii i kupić różdżkę, kulę albo księgę.
- Umiejętności (walka wręcz, łucznictwo, magia) rosną od trafień: 100 do poziomu 2, potem każdy poziom 1,5 raza więcej, maksimum 10. Każdy poziom to szybsze ataki. Na boiskach stoją lalka, tarcza i kryształ do treningu, a w szkołach można wykupić lekcje.
- Karta postaci (👤 albo klawisz C) pokazuje pieniądze, założone rzeczy, plecak na 5 miejsc (owoce do 99 w jednym miejscu) i umiejętności.

Misje i wrogów ustawia się w pliku `src/content/fabula.ts`, podając adresy, np. „Zamkowa 9”. Przedmioty i umiejętności są w `src/content/przedmioty.ts`, ceny owoców w `src/content/sklepy.ts`, a szablony losowych zleceń w `src/content/zlecenia.ts`.

## Dla programisty

Gra używa silnika Phaser 4 z TypeScriptem i Vite.

```bash
npm install
npm run dev      # serwer deweloperski (adres pojawi się w terminalu)
npm run build    # wersja produkcyjna w katalogu dist/
npm run map      # przebudowanie mapy z data/ (robi się też samo)
```

Po każdym pushu gra buduje się i publikuje na GitHub Pages (plik `.github/workflows/deploy.yml`). Trzeba to raz włączyć w repozytorium: **Settings → Pages → Source: GitHub Actions**.
