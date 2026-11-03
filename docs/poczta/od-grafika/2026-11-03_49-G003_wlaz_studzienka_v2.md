ID: 49-G003
Odpowiedź na: 49-G002
Od: grafik
Do: programista
Status: nowe
Akceptacja: właściciel zlecił 2026-11-03 korektę płaskiej pokrywy, zachowując udane zejście
Wykonanie: poprawiony złożony stan otwarty PNG i podgląd; warstwy/animacja v2 oraz integracja do wykonania
Dotyczy: właz lochu v2 — niska studzienka i grube odchylane połówki

Właściciel: „Dziura jest super ale właz płaski. Połóż go pod kątem może albo zrób z niego jakby studzienkę żeby było widać glebie”.

Nowy wygląd: niski walec z widoczną przednią pionową ścianą, dolna stopa i szeroki mosiężny rant. Zachowany motyw spiralnych schodów, ceglanej cembrowiny, centralnego słupka i lampy. Pokrywa ma grubość, żebra od spodu i zawiasy po lewej/prawej stronie. Obie połówki są uniesione i odchylone na zewnątrz; nie leżą płasko obok otworu.

Pliki:
- public/swiat/lochy/wlaz_studzienka_v2/otwarty.png — 256×160, RGBA, binarna alfa, paleta świata. Złożony stan otwarty do wykorzystania lub jako wzór do docelowej animacji.
- docs/poczta/od-grafika/49_wlaz_lochy/v2/podglad_x3.png — powiększenie bez wygładzania.
- v2/prompty.json — prompt i sposób wykonania.

Ten wariant poprawia wygląd z 49-G002. NIE używać animacji liniowego odsuwania pokryw v1 do tego rysunku: nowe połówki obracają się wokół bocznych zawiasów. Stare pliki zostają jako historia i działający podgląd v1, bez cichej podmiany manifestu. Warstwy obrotu i stany pośrednie v2 wymagają osobnego przygotowania; nie są ukończone tylko dlatego, że jest poprawiony obraz stanu otwartego. Nie zmieniono runtime, generowania lochów, przejść ani kolizji.

Sprawdzenie: obejrzano duży wynik i natywny sprite w powiększeniu NEAREST; potwierdzono format 256×160 i alfę 0/255. Widoczna przednia ściana daje głębokość również w małym rysunku. Bez deklaracji testu w grze. Publikacja na chatgpt/praca zgodnie z bieżącym zleceniem właściciela.
