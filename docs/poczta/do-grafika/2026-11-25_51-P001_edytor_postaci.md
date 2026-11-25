# 51-P001 – Postać do edytora wyglądu (menu, Kufer, portrety)

- **ID:** 51-P001
- **Odpowiedź na:** – (nowe zamówienie)
- **Od:** programista
- **Do:** grafik
- **Status:** nowe
- **Akceptacja:** właściciel, 25.11.2026 (zakres: fryzura, kolor włosów, kolor skóry; strój stały; bez wyboru sylwetki i pochodzenia)
- **Wykonanie:** –
- **Dotyczy:** wygląd bohatera w menu, w Kufrze, w portrecie HUD i w dialogach

## Po co

Gracz ma prosty edytor wyglądu z trzema przyciskami: **fryzura**, **kolor włosów** i **kolor skóry**, do tego „Losuj”.
Płeć wybiera się raz, przy zakładaniu postaci. Nowa postać dostaje losowy wygląd, a samouczek pokazuje, gdzie go zmienić.

Rysujesz **jedną ładną postać na płeć**, widzianą z przodu. Ja ją koloruję w grze na kolory wybrane przez gracza.
Tę samą postać pokażemy w menu, w Kufrze, w portrecie w HUD (wycięta głowa) i w okienkach rozmów.

Ludzika w świecie gry (mały, 20 px) **rysuje kod**: nie musisz go rysować. Dorobię mu fryzury podobne do Twoich.
Dlatego każda fryzura powinna mieć **wyraźną, prostą sylwetkę**, którą da się rozpoznać nawet w kilku pikselach.

## Postać

- **Dwie postacie bazowe:** kobieta i mężczyzna, młodzi strażnicy na początku przygody (ok. 20–25 lat).
- **Poza:** stoi przodem, lekko swobodnie (np. ciężar na jednej nodze, ręce luźno albo jedna na pasie).
  Cała postać od czubka głowy do butów. Twarz przyjazna, zdecydowana, nie przesłodzona.
- **Proporcje:** lekko baśniowe, ale nie chibi. Głowa trochę większa niż w rzeczywistości, by portret był czytelny.
- **Strój stały (nie zmienia się):** lniana koszula (naturalny len, lekko pognieciona, rękawy podwinięte albo luźne)
  i skórzane spodnie, do tego proste skórzane buty i pasek z mosiężną klamrą. Strój malujesz **w gotowych kolorach**.
- **Styl:** lekki, baśniowy steampunk jak w reszcie gry. Kolory nasycone, mocny kontrast i światło z lewej góry.
  **Nie** rób wyblakłej, szarej, chudej postaci: tak wyglądały odrzucone wersje modułowe (zamówienie 22). Wzorem jakości są
  ilustrowane ikony przedmiotów z zamówienia 45 (np. `public/items_hd/skorzana_zbroja.png`).

## Warstwy i kolorowanie (najważniejsze)

Każda postać to kilka plików PNG z przezroczystością. Wszystkie mają **ten sam rozmiar płótna i to samo położenie**
(nakładam je jedna na drugą bez przesuwania).

| Kolejność (od spodu) | Plik | Jak malujesz | Co robi gra |
|---|---|---|---|
| 1 | `wlosy_tyl_<fryzura>.png` | **odcienie szarości** | koloruje na kolor włosów |
| 2 | `skora.png` | **odcienie szarości** (twarz, szyja, dłonie, uszy, widoczne przedramiona) | koloruje na kolor skóry |
| 3 | `stroj.png` | **w kolorze** (koszula, spodnie, buty, pasek) | nic, zostaje jak jest |
| 4 | `twarz.png` | **w kolorze**: oczy, białka, rzęsy, źrenice | nic |
| 5 | `usta_policzki.png` | **odcienie szarości**, delikatnie | barwi w odcień pasujący do skóry |
| 6 | `brwi.png` | **odcienie szarości** | koloruje na kolor włosów (ciemniej) |
| 7 | `wlosy_przod_<fryzura>.png` | **odcienie szarości** | koloruje na kolor włosów |
| 8 | `kontur.png` | ciemny kontur całej postaci (np. #1e1a24), w kolorze | nic |

Kontur możesz też zostawić w poszczególnych warstwach. Wtedy w warstwach szarych kontur ma być **bardzo ciemnoszary**,
nie czarny w kolorze.

### Jak malować warstwy w szarościach

- **Jasne = światło, ciemne = cień.** Szarość średnia (ok. 50 %) to „zwykły” kolor danej części.
- Gra zamienia każdy odcień szarości na kolor z gotowej palety 4–5 tonów (cień chłodniejszy, światło cieplejsze).
  Dzięki temu złote, rude czy platynowe włosy mają prawdziwy połysk, a nie wyglądają jak przez kolorową szybkę.
- Na włosach maluj pasma i błyski (prawie biała szarość), w cieniach prawie czerń. Pełny zakres szarości jest mile widziany.
- **Skóra bez wpisanej karnacji:** żadnych różowych policzków ani czerwonawych cieni. Rumieńce i usta idą do osobnej
  warstwy 5, bo inaczej ciemna karnacja wyjdzie brudna, a jasna szara.
- **Nie** maluj w szarych warstwach niczego, co ma zostać w swoim kolorze (np. mosiężnej spinki we włosach).
  Taki dodatek daj do osobnego pliku `ozdoba_<fryzura>.png` w kolorze, nad włosami.

### Palety, na które koloruję (do sprawdzenia, jak wychodzi Twój rysunek)

Kolor skóry (8): `#FBE3CF` `#F1C7A5` `#E0AC85` `#C68B62` `#A86E48` `#8A5636` `#6B4029` `#4A2C1E`

Kolor włosów (9): czarny `#1F1A1A`, ciemny brąz `#3B2A20`, brąz `#5E3E2A`, kasztan `#7A3D22`, rudy `#B5481F`,
miedziany `#C8743A`, blond `#D9B66A`, platyna `#EDE2C4`, siwy `#A9A6A8`

To kolory średnie. Cienie i światła dobieram sam. Paletę mogę jeszcze zmienić po próbie.

## Fryzury

Fryzury muszą działać przy każdym kolorze włosów i każdej karnacji. **Różnorodność pochodzenia** daje kolor skóry
razem z fryzurami (kręcone, afro, warkocze). Osobnych postaci „pod pochodzenie” nie robimy.

**Kobieta (6):** długie rozpuszczone · wysoki kucyk · krótki bob · dwa warkocze · kok · burza loków / afro

**Mężczyzna (6):** krótkie zaczesane · na jeża (bardzo krótkie) · średnie, rozczochrane · dłuższe związane w kitkę ·
krótkie kręcone / afro · z boku podgolone, góra dłuższa

Każda fryzura ma warstwę przednią i tylną (tylną możesz pominąć, jeśli nic nie wystaje za głowę).
Fryzura nie może zasłaniać oczu. Z tyłu sięga najwyżej do łopatek, bo niżej zakrywałaby kołnierz.

## Rozmiar i pliki

- **Płótno:** 768 × 1152 px (proporcje 2:3), przezroczyste tło. Postać od ok. 40 px od góry do ok. 30 px od dołu,
  wyśrodkowana. Mniejsze wersje robię sam.
- **Ta sama głowa w tym samym miejscu** we wszystkich fryzurach danej płci (fryzury tylko dokładamy).
- **Punkt portretu:** podaj w pliku `manifest.json` środek twarzy i promień kółka, w którym mieści się głowa z włosami
  (do wycięcia portretu w HUD i dialogach), na przykład:
  ```json
  { "plec": "k", "plotno": [768, 1152], "portret": { "srodek": [384, 230], "promien": 170 },
    "fryzury": ["dlugie", "kucyk", "bob", "warkocze", "kok", "loki"] }
  ```
- **Nazwy:** folder `kobieta/` i `mezczyzna/`, w nich pliki jak w tabeli, np. `kobieta/wlosy_przod_kucyk.png`.
  Nazwy fryzur bez polskich liter i spacji.
- Dołącz podgląd złożonej postaci w kilku kolorach (np. ciemna skóra + platyna, jasna skóra + rudy),
  żeby było widać, że warstwy szare dobrze się kolorują.

## Próba (najpierw tylko to)

1. **Kobieta:** skóra, strój, twarz, usta, brwi, kontur i **dwie fryzury**: długie rozpuszczone oraz burza loków / afro.
2. Podgląd w trzech zestawieniach: `#FBE3CF` + rudy, `#A86E48` + czarny, `#4A2C1E` + platyna.

Po próbie wstawię ją do edytora w grze i dam znać, co poprawić. Dopiero potem robimy mężczyznę i resztę fryzur.

## Później (nie teraz)

- zarost dla mężczyzny jako osobna warstwa,
- 2–3 kształty twarzy na płeć,
- warianty postaci w zbroi z gry.
