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
