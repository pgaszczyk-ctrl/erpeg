# Erpeg

Prosta gra RPG z widokiem z góry, w stylu Zeldy i Tibii z lat 90. Działa w przeglądarce, na komputerze i na telefonie.

## Jak grać

- **Komputer:** WASD albo strzałki to ruch, SPACJA (albo J, Enter albo kliknięcie myszą) to cios mieczem.
- **Telefon:** lewa połowa ekranu działa jak joystick (połóż kciuk i przesuń), prawa połowa to cios mieczem.

Pokonane glutki zostawiają monety albo serduszka (serduszko leczy).

## Co jest w grze (wersja 0.1)

- losowo wygenerowana mapa: łąki, ścieżki, jeziora, lasy, skały i krzaki,
- postać, która chodzi swobodnie w 8 kierunkach i atakuje mieczem,
- glutki, które krążą po mapie i gonią gracza, gdy się zbliży,
- życie w serduszkach, licznik monet i ekran „Zginąłeś!” z restartem.

Grafika jest tymczasowa, narysowana w kodzie. Później można ją podmienić na gotową paczkę, np. *Ninja Adventure* (CC0) z itch.io.

## Dla programisty

Gra używa silnika Phaser 4 z TypeScriptem i Vite.

```bash
npm install
npm run dev      # serwer deweloperski (adres pojawi się w terminalu)
npm run build    # wersja produkcyjna w katalogu dist/
```

Po każdym pushu gra buduje się i publikuje na GitHub Pages (plik `.github/workflows/deploy.yml`). Trzeba to raz włączyć w repozytorium: **Settings → Pages → Source: GitHub Actions**.
