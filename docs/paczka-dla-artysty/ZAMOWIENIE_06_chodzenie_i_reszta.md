# Zamówienie 06 – poprawka chodzenia i wszystko, co zostało

> Zasady ogólne bez zmian (`CZYTAJ_MNIE`, `STYL_SWIATA_steampunk.md`). To zamówienie zbiera **wszystko, co jeszcze jest do zrobienia** (zastępuje 05 – kocioł, fontanna, wieża i drogowskaz z paczki 04d już są w grze, dzięki!).

## A. Chodzenie – najważniejsze (poprawka istniejących arkuszy)

W grze postacie „lewitują”: przy chodzeniu ruszają tylko ręką, a nogi stoją. Powód: w wielu arkuszach **krok A i krok B są prawie identyczne** (zwłaszcza w widoku z boku), a gra przy chodzeniu pokazuje na zmianę właśnie te dwie klatki. Zestawienie: `2_uwagi_do_v1/kroki_A_B_za_podobne.png`.

Na razie gra wstawia pomiędzy kroki klatkę „stoi” (krok A – stoi – krok B – stoi), więc nogi już się ruszają – ale ładny chód będzie dopiero z poprawionych klatek:

- **krok A** = lewa noga wyraźnie do przodu, prawa do tyłu (rozkrok ok. 6–8 px w pliku 64 × 64);
- **krok B** = odwrotnie: prawa do przodu, lewa do tyłu (lustrzanie do A, ale nie ta sama klatka!);
- **stoi** = nogi razem, **ten sam wygląd reszty ciała** (włosy, kucyk, hełm, torba dokładnie jak w krokach);
- ręce: przeciwnie do nóg (lewa noga do przodu → prawa ręka do przodu);
- przy spódnicach i habitach: spod spodu wyraźnie wychodzi raz jedna, raz druga stopa, a rąbek lekko się kołysze;
- sprawdzaj wszystkie trzy rzędy (dół, bok, góra) – najczęściej zawodzi **bok**.

**Do poprawy w pierwszej kolejności** (najmniejsza różnica między A i B): Siostra Margo, Babcia Iwonka, Dziadek Marek (bok), mieszkaniec 15, mieszkańcy 09 i 10 (bok), bandyta (bok), traveler, bohater 05, bohater 10 (bok). Potem przejrzyj pozostałych mieszkańców 01–14, bohaterów 04–10, Babcię Grażynkę i maga. Nazwy plików, format i maski bez zmian – podmienimy arkusze 1 : 1.

## B. Latarnie i krawędzie dachów

Właściciel zauważył, że przy pięknych postaciach **latarnie i krawędzie dachów wyglądają słabo**. Po naszej stronie mapa jest już rysowana dwa razy dokładniej (Twoje grafiki tracą mniej szczegółów). Od Ciebie:

1. `latarnia_gazowa` – **nowa wersja 24 × 72, 2 klatki (dzień / noc)**: smuklejszy słup, wyraźna mosiężna głowica z szybkami, nocą ciepły blask narysowany wokół szybek (nie cała klatka). Kontur 1 px, bez rozmytych pikseli.
2. `dach_okap` – **pasek krawędzi dachu 48 × 9, kafelkujący się poziomo**: rynna / okap z dachówek (krawędź od strony patrzącego). Gra położy go wzdłuż dolnych krawędzi każdego dachu zamiast obecnej rysowanej kreski. Jeden wariant ciemny, pasujący do wszystkich dachów.
3. `dach_kalenica` – (opcjonalnie) pasek 48 × 6 kalenicy (grzbietu dachu), kafelkujący się poziomo.

## C. Miejsca i postacie (z zamówienia 05)

| Plik | Co | Uwagi |
|---|---|---|
| `kociol_publiczny` | **2. klatka** obok obecnej (arkusz 144 × 72): kocioł **rozpalony** miodowym światłem | misja Martina „Zmarznięty smok” go rozpala; na razie blask dorysowuje gra |
| `medrczyni` | **Wędrowna Mędrczyni** – arkusz postaci 192 × 192 + maska | szata podróżna, torba z mapami, mosiężne gogle albo astrolabium; `plec: k` |
| `medrzec` | (opcjonalnie) Wędrowny Mędrzec, inny niż mag Albrecht | płaszcz podróżny, laska; `plec: m` |
| ikona `podkowa_szczescia` | 16 × 16 jak w `4_przedmioty_obecne` | talizman: żelazo + mosiężne gwoździe |

## D. Zaległości z zamówienia 03

- ściany: biały tynk, deski, kamień, mur pruski, wersje z rurą, witryna sklepu;
- podłoża: działki, cmentarz, parking, boisko, plac zabaw, piasek, mokradło, puszcza;
- dachy: gont, strzecha, miedź;
- postacie: Luigi, Martin, woźnica, trener, biegaczka, mądrale, pies.

## Kolejność

1. **A – poprawione kroki** (najpierw lista „w pierwszej kolejności”), 2. **B – latarnia i okap**, 3. kocioł rozpalony i mędrczyni, 4. reszta w dowolnej kolejności.
