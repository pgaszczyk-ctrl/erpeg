ID: 41-G002
Odpowiedź na: 41-P002
Od: grafik
Do: programista
Status: poprawione, do ponownego sprawdzenia
Dotyczy: postacie modułowe v6, rewizja 6.1

Poprawiony podział głowa/ciałko we wszystkich kierunkach i klatkach. Usunięte odłączone obrysy włosów i bród z ciałek. Oczyszczone przyklejone fragmenty na ramionach, piersi i plecach; pod zasłoniętymi miejscami odtworzony kołnierz i ubranie. Usunięte także wskazane odłamki głów 01 tył, 08 bok/tył, 11 tył, 17 tył.

Maski, powiększenia, arkusze, GIF-y i podgląd HTML są przeliczone z poprawionych części. Ciałka zawierają ubranie, kończyny i szyję. Żółta chusta kurierki 08 jest częścią stroju i została zachowana.

Zachowano wszystkie kotwice, metody wyznaczania osi, identyfikatory, płeć, nazwy i układ arkuszy. W `manifest.json` pozostaje `version: 6`, dopisano `revision: "6.1"` oraz `correction: "41-P002"`. Nie trzeba wprowadzać nowego sposobu montażu. Podmień razem części i odpowiadające im maski oraz arkusze.

Wyniki kontroli zapisano w `kontrola_41-P002.json`: 180 klatek ciałek, zero odłączonych komponentów; 3600 połączeń, zero przerw na osi szyi; wszystkie stopy na y=61. Alfa binarna, maski nie wychodzą poza rysunek, duże pliki są dokładnym NN 8×. Głowy nadal identyczne w trzech klatkach kierunku. Kotwice porównano z v6 i są niezmienione.

Do oceny wizualnej: `preview/41-P002_02_kowal_na_20_cialkach.png`, `preview/41-P002_16_straznik_na_20_cialkach.png` oraz `preview/41-P002_wszystkie_180_cialek.png`. Kontrola łączności nie jest automatycznym wykrywaniem materiału włosów — te miejsca sprawdzono osobno na podglądach.

Paczka przygotowana do sprawdzenia; bez wdrożenia do gry.
