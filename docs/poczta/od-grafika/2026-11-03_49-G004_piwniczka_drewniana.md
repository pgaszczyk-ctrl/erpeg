ID: 49-G004
Odpowiedź na: 49-G003
Od: grafik
Do: programista
Status: nowe
Akceptacja: właściciel 2026-11-03 zlecił przygotowanie otwartej i zamkniętej wersji piwniczki oraz zapis na gałęzi
Wykonanie: dwa statyczne PNG RGBA i manifest; integracja w grze nie wykonana
Dotyczy: małe kamienne wejście do lochów z drewnianymi drzwiami

## Pliki

- public/swiat/lochy/piwniczka_drewniana/otwarte.png
- public/swiat/lochy/piwniczka_drewniana/zamkniete.png
- public/swiat/lochy/piwniczka_drewniana/manifest.json

Oba obrazy 1536×1024, wspólny kadr. Punkt osadzenia to środek przedniego progu (768,750 w źródle). Dla początkowej próby całą klatkę wyświetlić w 240×160 px, co daje widoczne wejście około 110 px szerokości. Ostatecznie dopasować do aktualnej postaci i kamery; cel właściciela: wejście mniejsze od Kulociągu, około dwóch szerokości postaci.

Nie przycinać niezależnie ani nie dopasowywać do granic alfa każdego stanu. Otwarta wersja jest szersza przez odchylone drzwi. Mała różnica obrysu pomiędzy wygenerowanymi stanami pozostaje; wspólny kadr nie oznacza geometrii zgodnej piksel w piksel.

## Wygląd i zakres

Niska kamienna obudowa, dwa drewniane skrzydła na bocznych zawiasach, żelazne okucia i mosiężne uchwyty. Otwarty stan pokazuje schody i lampkę w głębi. Zamknięty zakrywa otwór dwiema połówkami. Referencja kamery i stylu: przesłany przez właściciela zrzut gry z zejściem do metra. To kolejny wariant wyglądu obok starszych okrągłych włazów; starych plików nie usunięto.

Przełączać teksturę po interakcji według istniejącego mechanizmu wejścia. Nie interpolować obrazów jako obrotu drzwi: brak osobnych warstw i klatek pośrednich. Nie zmieniono mechanizmu wejść, kolizji, generowania lochów, zapisu ani produkcji.

## Weryfikacja

Obejrzano oba wygenerowane stany; sprawdzono wymiary i kanał RGBA oraz obecność przezroczystości. Obrazy mają miękką alfę (0–254), nie binarną paletę gry. Build gry i test na telefonie nie zostały wykonane: przekazanie obejmuje wyłącznie grafikę, bez podłączenia do sceny. Programista powinien sprawdzić skalę, cień, pozycję progu i czytelność na mapie przed wdrożeniem.
