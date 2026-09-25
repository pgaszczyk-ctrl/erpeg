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

Misje i wrogów ustawia się w pliku `src/content/fabula.ts`, podając adresy, np. „Zamkowa 9”.

## Dla programisty

Gra używa silnika Phaser 4 z TypeScriptem i Vite.

```bash
npm install
npm run dev      # serwer deweloperski (adres pojawi się w terminalu)
npm run build    # wersja produkcyjna w katalogu dist/
npm run map      # przebudowanie mapy z data/ (robi się też samo)
```

Po każdym pushu gra buduje się i publikuje na GitHub Pages (plik `.github/workflows/deploy.yml`). Trzeba to raz włączyć w repozytorium: **Settings → Pages → Source: GitHub Actions**.
