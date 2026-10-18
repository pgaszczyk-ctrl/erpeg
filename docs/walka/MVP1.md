# Walka turowa na mapie – MVP 1 (TEST)

Ustalenia właściciela z 17.10.2026: chodzenie po mapie zostaje na żywo, walka jest turowa, w tym samym miejscu mapy (jak w HoMM). Grę da się przejść bez walki. Dotyczy tylko serwera testowego (`TEST`), nigdy dema z kodu QR. Porównanie: `?tury=0` wyłącza, `?tury=1` włącza (zapamiętywane na urządzeniu, `exp-tury`).

Wszystkie liczby: `src/content/walkaTurowa.ts` (próba do strojenia, nie zatwierdzony balans).

## Spotkanie

- Potwory nikogo nie gonią i nie biją przy dotyku (`Slime.spokojny`). W gangach siedzą **zbitymi grupkami** w małym miejscu terenu (`GRUPKI_GANGU`: Banda – 1 grupka 3–4, Mały gang – 1 grupka 3–4 + herszt, Wielki gang – 3 grupki, herszt przy ostatniej). Czerwony dym na granicy terenu zostaje.
- Wokół każdej grupki jest **bliska przestrzeń**: delikatny fioletowy krąg (przy smoku zielony). Wejście w krąg zatrzymuje grę i pyta: **Podejdź / Odejdź**. Cios albo strzał w członka grupki z daleka zadaje to samo pytanie, bez obrażeń.
- **Odejdź** jest darmowe: bohater cofa się kilka metrów za krąg. Pytanie wraca dopiero, gdy odejdzie dalej (`powrotW`) i wróci.
- **Podejdź**:
  - smok – rozmowa (bez walki w MVP 1);
  - rozmowni (bandyci, herszt) – rozmowa: zapłać okup (grupka odchodzi, bez łupów i EXP; rozbity tak gang liczy się do próby maga), walcz albo odejdź;
  - narwani (chochliki, driady, zombie, szkielety, wodnik, bloby) – od razu walka.
- Pojedynek z mieszkańcem rozgrywa się w turach od razu po przyjęciu wyzwania (fioletowe serduszka bez zmian).

## Walka

- Grupka się **rozstawia** (najpierw rezerwacja miejsc osiągalnych po mapie, potem krótkie dojście): wojownicy w płytkim łuku przed bohaterem, dystansowi (szkielety, wodnik) dalej na bokach, herszt pośrodku z tyłu. Nikt na nikim nie stoi. Kamera obejmuje walkę nad panelem i jeśli wszyscy się mieszczą, przybliża o stopień.
- Panel na dole: portret, życie, „Ruchy 3/3”, podpowiedź i dokładnie trzy przyciski **Cios · Ruch · Specjalne** (Specjalne: Mocny · Lecz · Ucieczka, „Wróć”), pod nimi „Zakończ turę”.
- Ruchy: 3 (poziom 1–4), 4 (od 5), 5 (od 12). Cios 1, Ruch 1, Mocny 2, Lecz 1. Ucieczka kończy walkę, kosztuje 1 serce (nigdy do śmierci), a grupka zostaje.
- **Cel wybiera się dotknięciem postaci na mapie**. Pierwsze dotknięcie zaznacza cel (pierścień, pasek życia, napis „Cios · 1 ruch”), drugie dotknięcie albo przycisk zatwierdza. Cios ma wbudowany krótki doskok z powrotem na miejsce (bez przenikania przez ściany i postacie). Gdy cel jest za daleko, pojawia się „Podejdź bliżej (Ruch)”. Z łukiem lub różdżką w ręce „Cios” staje się „Strzał” / „Czar” (zasięg, wolna linia, amunicja).
- **Ruch**: podświetlony zasięg prawdziwej drogi. Dotknięcie punktu pokazuje trasę, drugie dotknięcie idzie.
- Tura wrogów: każdy robi jedną rzecz – podchodzi albo bije. Wręcz biją najwyżej dwaj naraz, reszta czeka w odległości. Strzelcy strzelają z dystansu (najwyżej 2 strzały na turę).
- Szczęście (koniczynka ☘): krytyk, szczęśliwy unik, czasem +1 ruch na początku tury. Pancerz nadal blokuje ciosy.
- Wrogowie mają w turach połowę życia, a ćwiczenie umiejętności liczy się ×6 za cios (ciosów jest dużo mniej niż w walce na żywo).
- Po wygranej bohater **sam wraca do pełnego zdrowia**. Łupy leżą na ziemi jak dawniej.
- Zamknięcie karty w trakcie walki: bohater wraca z życiem sprzed walki, grupka z pełnym życiem, bez nagród.

## Hotel

Na TEST noc w hotelu zamiast niebieskich serduszek daje przez 30 minut od pobudki **więcej szczęścia (×2)** i **+1 ruch w każdej turze** (`session.flagi.wyspany`). Szybszy krok zostaje.

## Poza MVP 1

- Walka ze smokiem w turach (ogień, kwas, lot jako zapowiadane ataki). Smok z fabuły i smok z dema walczą po staremu.
- Aktywny unik i blok, fale, zapis stanu walki.
- Uproszczenie HUD po walce (leczenie poza walką jest mniej potrzebne).

Test przeglądarkowy: `scripts/tests/browser-walka-tur.mjs` (`TELEFON=1` – telefon 390×844).

## Poprawki po pierwszej grze właściciela (18.10.2026)

- **Ruch przeciągnięciem**: złap bohatera palcem (albo myszką) i przeciągnij w bok – pokazuje się trasa do najbliższego osiągalnego miejsca, puszczenie = ruch (1 ruch). Bez wciskania „Ruch”.
- **Trudniej**: wrogowie mają 0,8 zwykłego życia (było 0,5), biją ×1,3 (było 0,65), trafiają w 80% (było 70%). Herszt i berserker robią **dwa działania** w turze, a herszt bije zawsze (poza limitem dwóch napastników).
- **Bliżej po ciosie**: cios pada z miejsca jak najbliżej celu, a bohater cofa się tylko część doskoku – na poziomie 1 o 15%, do 80% na poziomie 15 (`WALKA_TUROWA.powrot`).
- **Więcej gangów**: w walce turowej ×2,5 (`GRUPKA.gestosc`).
