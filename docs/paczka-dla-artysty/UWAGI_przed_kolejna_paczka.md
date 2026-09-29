# Uwagi przed kolejną paczką (po mieszkańcach 01–10)

Dzięki za mieszkańców 01–10. Są już w grze, maski z v3 i z 06–10 działają dobrze. Kilka rzeczy na następne paczki:

1. **Płeć i wiek każdej postaci.** W `metadata.json` przy każdej postaci dopisz `"plec": "k"` (kobieta/dziewczynka) albo `"m"` (mężczyzna/chłopiec) oraz `"wiek": "dziecko"`, `"dorosly"` albo `"starszy"`. Gra dobiera po tym imię. Nazw plików nie zmieniaj.
2. **Format bez zmian:** arkusz 192×192, klatki 64×64. Rzędy: dół, bok (patrzy w lewo), góra. Kolumny: krok A, stoi, krok B. Stopy na y = 62, środek na x = 32, margines 5 px. Klatka „stoi” ma być narysowana tak samo jak kroki, różnić mogą się tylko nogi i ręce.
3. **Maski** jak w v3 i 06–10: tylko wnętrze ubrań (czerwony = główne ubranie, zielony = drugi kolor), bez konturu, skóry, włosów, zarostu i czapek.
4. **Nie ucinaj głowy.** W mieszkańcu 08, w widoku od tyłu, czubek głowy jest płasko ścięty. Proszę to poprawić i pilnować w kolejnych postaciach, żeby cała głowa się mieściła.
5. **Różnorodność.** Mieszkaniec 07 (chłopiec w musztardowej tunice) jest bardzo podobny do 02. Kolejne postacie niech różnią się sylwetką i ubraniem. Kolory gra i tak zmienia sama z maski, więc ważniejsze są różne kroje: płaszcz, kurtka, sukienka, fartuch, kapelusz, laska, torba, okulary, różne fryzury, różny wzrost.
6. **Kolejność następnych paczek:**
   - mieszkańcy 11–15, w tym więcej dzieci i starszych;
   - bohaterowie 04–10 do wyboru przez gracza, dziewczyny i chłopcy, bardziej „przygodowi”;
   - wrogowie: driada, zombie, szkielet, bandyta, herszt (bez czerwonego obrysu, gra dodaje poświatę sama).
7. Pełne wytyczne i lista wszystkiego do narysowania są w pliku `CZYTAJ_MNIE.html` w tej paczce.

## Do poprawy w paczce v5 (mieszkańcy 11 i 15)

8. **Mieszkańcy 11 (dziewczynka z kucykami) i 15 (kobieta w spódnicy) mają zepsute klatki kroku.** W krokach A i B, najbardziej w widoku z boku, spódnica jest narysowana jako płaski poziomy pasek, a nogi wystrzelone do przodu. W grze postać wygląda przy chodzeniu, jakby była przepołowiona. Proszę przerysować krok A i krok B w każdym kierunku tak, żeby spódnica miała ten sam kształt co w klatce „stoi” (najwyżej lekko się kołysze), a spod niej wychodziły tylko nogi, jedna trochę do przodu, druga do tyłu. Do czasu poprawki obie postacie są w grze wyłączone.

## Po paczce „bohaterowie 04–10”

9. **Bohaterowie 04–10 są przyjęci** i są już w grze, maski też. Dzięki!
10. **Mieszkańcy 11 i 15 nadal do poprawy.** Pliki w folderze `poprawki_mieszkancow_11_15` są piksel w piksel takie same jak poprzednie (sprawdzone programem), więc poprawka nie trafiła do paczki. Problem z punktu 8 dalej jest: w krokach A i B (zwłaszcza z boku) spódnica jest płaskim paskiem, a nogi wystrzelone do przodu. Proszę narysować te klatki od nowa: spódnica w tym samym kształcie co w klatce „stoi”, spod niej widać tylko nogi.
11. **Następna paczka: wrogowie** – driada, zombie, szkielet, bandyta, herszt (ten sam format 3×3 po 64×64, bez czerwonego obrysu, gra dodaje poświatę sama; herszt też 64×64, gra go powiększa).

## Po paczce „wrogowie v1”

12. **Wrogowie przyjęci** (driada, zombie, szkielet, bandyta, herszt) i są w grze. Herszt jest powiększany 1,8×, a wielki herszt 2,5× i dodatkowo zaczerwieniony. Dzięki!
13. **Mieszkańcy 11 i 15 poprawieni, są z powrotem na ulicach.** Drobiazg: u 11 w widoku od tyłu kucyki są ścięte płasko u góry – przy okazji warto je domknąć.

## Po paczce „postacie stałe 01”

14. **Mag, Siostra Margo, Dziadek Marek, Babcia Iwonka i Babcia Grażynka przyjęci** i chodzą już po swoich ulicach. Poprawka czubka włosów u mieszkańca 11 też jest. Dzięki!
15. **Następna paczka: świat** – `ZAMOWIENIE_swiat_01.md` (podłoże, drogi, dachy). Na start 3 pliki na próbę: `podloze_trawa`, `podloze_bruk`, `dach_dachowka_czerwona_jasna`.

## Po paczce „świat 01 – próba”

16. **Trawa, bruk i czerwona dachówka przyjęte** – są w grze, zrzut: `5_zrzuty_z_gry/swiat_proba_01_w_grze.png`. Miasto od razu wygląda lepiej!
17. **Kafelkowanie – jedna poprawka na przyszłość:** w plikach ostatni rząd i ostatnia kolumna są takie same jak pierwsze. Przy powtarzaniu daje to podwójny rząd pikseli na łączeniu (tym razem przycięliśmy je sami). Kafel powinien kończyć się tak, żeby **następny piksel po prawej był pierwszym pikselem z lewej** – czyli bez powtarzania krawędzi.
18. W trawie żółte kwiatki leżą w równej siatce i przy powtarzaniu widać wzór. Przy kolejnych teksturach lepiej rozsiewać drobiazgi nieregularnie (albo wcale).
19. **Dalej:** brązowa dachówka i łupek (dziś te domy mają jeszcze płaski kolor), potem reszta podłoża z tabeli 1 w `ZAMOWIENIE_swiat_01.md`: `podloze_droga`, `podloze_las`, `podloze_park`, `podloze_plac`, `podloze_woda`, `podloze_pole`…

## Po paczce „świat 02”

20. **Brązowa dachówka, łupek i droga gruntowa przyjęte** – krawędzie tym razem idealne, bez podwójnych rzędów. Wszystkie dachy i drogi w mieście mają już teksturę, zrzut: `5_zrzuty_z_gry/swiat_02_w_grze.png`. Dzięki!
21. **Dalej, wg `ZAMOWIENIE_swiat_02.md` punkt 3.2:** `podloze_plac`, `podloze_park`, `podloze_las`, `podloze_woda`, `podloze_pole`, potem reszta podłoża oraz gont, strzecha i miedź.

## Po paczce „świat 03a – podłoża”

22. **Plac, park, las, woda, pole i zarośla przyjęte** – krawędzie idealne. W grze (zmniejszone 3×) wyglądają dobrze, nie są za drobne: zrzuty `5_zrzuty_z_gry/swiat_02_w_grze.png` (park, las, pole, zarośla) i `swiat_03a_woda.png`. Dalej wg `ZAMOWIENIE_03_duza_partia.md`, sekcja C (ściany + latarnia + komin).

## Po paczce „świat 03c – ściany i ulica”

23. **Ściany (tynk kremowy, cegła), latarnia gazowa i komin z parą przyjęte** – są w grze: ściany na frontach domów (niskie domy pokazują dolną część tekstury, jak ustaliliśmy), latarnie co ok. 30 m wzdłuż ulic (nocą świecą), kominy na co trzecim większym dachu. Zrzut: `5_zrzuty_z_gry/swiat_03c_sciany_latarnie.png`.
24. Na mapie ściany są niskie (4–8 punktów), więc najlepiej działają **duże, wyraźne okna i kontrastowe fugi** – drobne detale znikają. Przy kolejnych materiałach (biały tynk, deski, kamień) można śmiało rysować grubiej.
25. **Dalej:** sekcja D (drzewa, grzyb, kłoda, ławka, zegar, słup ogłoszeniowy, studzienka z parą), potem E (Luigi, Martin, woźnica…), potem reszta ścian z C.

## Mgła nieznanych miejsc – pergamin (nowe, do zrobienia przy okazji)

26. Nieodkryte miejsca nie są już czarne: gra zakrywa je **starą mapą – pergaminem**, jasnym w dzień, ciemniejszym o zmierzchu i nocą (według prawdziwego wschodu/zachodu słońca). Na razie pergamin rysuje program – zrzut `5_zrzuty_z_gry/mgla_pergamin_dzien_zmierzch_noc.png`.
27. Prośba: **`mgla_pergamin`** – 384 × 384 px, kafelkujący się (bez powtarzania krawędzi), pełny, bez przezroczystości. Jasny, raczej chłodny, szarawo-kremowy papier (nie żółto-brązowy – ciepły pergamin zlewał się z dachami i drogami; dzień – nocą gra sama go przyciemni): **duże, miękkie plamy i przebarwienia, delikatne włókna, rzadko rozsiane wyblakłe znaczki** (krzyżyki, kropki) w kolorze wyblakłego atramentu. **Bez siatki** – siatkę kartograficzną (co 25 m, mocniej co 100 m) gra rysuje sama, przypiętą do mapy. Gra zmniejsza go ok. 6×, więc drobne szczegóły znikną – rysuj duże i miękkie, bez napisów, bez niczego, co wygląda jak konkretny kształt (drzewo, dom). Plik do folderu `swiat/`.

28. **Zmiana:** prośba o `mgla_pergamin` przeniesiona do `ZAMOWIENIE_04_mgla_i_dekoracje.md` (sekcja A) – z siatką kartograficzną rysowaną ręką przez Ciebie (równa siatka z programu wyglądała jak cerata), papier przesuwa się powoli z bohaterem (1/20 jego prędkości). Punkt 27 nieaktualny.

## Po paczce „świat 04a – mgła-pergamin”

29. **Pergamin przyjęty – w grze jest wariant z rzadszą siatką** (gęstszy też jest w grze do przełączenia). Zrzut `5_zrzuty_z_gry/mgla_pergamin_04a_w_grze.png`: od lewej rzadsza siatka w dzień, gęstsza w dzień, zmierzch, noc. Ręczna siatka wygląda świetnie, zupełnie inaczej niż „cerata” z programu. Dzięki!
30. **Dalej wg `ZAMOWIENIE_04_mgla_i_dekoracje.md`:** C (drzewa, grzyb, kłoda), potem B (ławka, donica, skrzynie, studzienka, hydrant, kosz…), potem D (fontanna, kocioł, wieża, drogowskaz).

## Po paczce „świat 04c – przyroda”

31. **Przyroda przyjęta i już w grze:** jabłonie, śliwy, winorośl (drzewa do otrząsania), sosny w lasach (do ścinania, z pieńkiem), grzyby i kłody (do zbierania, też jako ikony na ekranie), a duże drzewa liściaste i krzaki rosną jako ozdoba w parkach, na trawnikach i cmentarzach. Zrzut z parku: `5_zrzuty_z_gry/swiat_04c_przyroda_park.png`. Dzięki!
32. **Dalej wg `ZAMOWIENIE_04_mgla_i_dekoracje.md`:** B (ławka, donica, skrzynie, studzienka z parą, hydrant, kosz, płoty, welocyped, poczta pneumatyczna), potem D (fontanna ze smokiem, smoczy kocioł, wieża zegarowa, drogowskaz).

## Po paczce „świat 04b – dekoracje”

33. **Dekoracje przyjęte i już w grze:** ławki z koszami przy alejkach w parkach, studzienki z parą w jezdniach (3 klatki – różne studzienki pokazują różną ilość pary), hydranty przy ulicach, słupy ogłoszeniowe przy większych ulicach, zegar na środku większych placów, donice przy drzwiach sklepów, szkół, kościołów, bibliotek, hoteli i urzędów, skrzynie przy sklepach i wozach kupców, welocypedy przy szkołach i bibliotekach, a **poczta pneumatyczna stoi tam, gdzie na prawdziwej mapie jest poczta, skrzynka pocztowa albo paczkomat**. Działa to też na mapach świata (sprawdzone w Berlinie i Madrycie). Zrzut `5_zrzuty_z_gry/swiat_04b_dekoracje.png` (od lewej: Plac Litewski, Berlin, Madryt). Płotów gra jeszcze nie stawia. Dzięki!
34. **Dalej:** `ZAMOWIENIE_05_miejsca_i_postacie.md` – smoczy kocioł (2 klatki: zgaszony / rozpalony), mędrczyni, fontanna, wieża zegarowa, drogowskaz, ikona Podkowy Szczęścia.

## Po paczkach „świat 04d” i „postacie stałe 02”

35. **Kocioł, fontanna, wieża zegarowa i drogowskaz przyjęte.** Fontanna ze smokiem stoi na większych placach, wieża zegarowa na placach przy ratuszach, smoczy kocioł na lubelskim Rynku przy Trybunale (po misji Martina zaczyna świecić – na razie blask dorysowuje gra) i na co trzecim mniejszym placu, a Twój drogowskaz stoi przy wszystkich drogach za miastem. Postać może przejść „za” nimi, twarda jest tylko podstawa.
36. **Luigi, Martin i woźnica przyjęci** – Luigi chodzi po Nałęczowskiej, Martin po Irysowej, a woźnica stoi przy każdym wozie na stacji. Zrzut `5_zrzuty_z_gry/swiat_04d_i_postacie_stale_02.png`. Dzięki!
37. **Ważne – chodzenie:** postacie „lewitowały”, bo w wielu arkuszach krok A i krok B są prawie takie same. Szczegóły i lista w `ZAMOWIENIE_06_chodzenie_i_reszta.md`, sekcja A (zestawienie `2_uwagi_do_v1/kroki_A_B_za_podobne.png`).
38. **Dalej:** `ZAMOWIENIE_06_chodzenie_i_reszta.md` – poprawione kroki, nowa latarnia, okap dachu, **wóz woźnicy**, rozpalony kocioł, mędrczyni i zaległości.
39. **Jeden styl (najważniejsze teraz):** właściciel widzi w grze „zlepek 4 stylów”. Wzorem są ludziki i przygaszone podłoża/dachy; kocioł, fontanna i wieża są za dokładne i za jaskrawe, a plansza (krawędzie, obrysy) za mało „pikselowa”. U nas obrysy mapy są już cieńsze i w kolorze konturu postaci (`5_zrzuty_z_gry/obrysy_przed_po.png`: lewo przed, prawo po). Od Ciebie: `ZAMOWIENIE_06`, punkt 0.
40. **Wozy:** 3 wersje (pusty, beczki, worki) i 3 maści koni (czarny, brązowy, szary – najlepiej przez maskę) – `ZAMOWIENIE_06`, punkt B2.

## Po paczce „wozy konne final”

41. **Wozy przyjęte – są dokładnie takie, jak trzeba.** Stoją przy każdej stacji (ładunek i maść losowane dla stacji, koń co chwilę przestępuje), obok woźnica. Zrzut `5_zrzuty_z_gry/wozy_w_grze.png`. Ten sposób pracy (podgląd → pliki z zaakceptowanego obrazka, duże, bez rysowania od nowa) zostaje na stałe.
42. **Dalej:** `ZAMOWIENIE_07_trening_i_reszta_swiata.md` – kukły treningowe (dokładny opis), potem wszystko, co w grze wciąż rysuje program (zestawienie `5_zrzuty_z_gry/do_przerysowania_grafiki_z_programu.png`). Zamówienie 06 nadal obowiązuje.
43. **Przyrządy treningowe przyjęte** (kukła, druga kukła z czerwoną wstążką, tarcza, kryształ) – stoją na boiskach, przy trafieniu pokazują klatki „trafiony” i „wraca”. Zrzut `5_zrzuty_z_gry/trening_w_grze.png`. **Trenera i biegaczki nie rysuj** – zostali usunięci z gry. Dalej: `ZAMOWIENIE_07`, sekcja B (szyldy, stragan kupca, rzeczy do podniesienia, potem smok).
