# Exp-lore – wiedza dla czatu 🧭 Questy

## Główny wątek „Cień smoka”
- Po 60 s marszu nad bohaterem przelatuje cień smoka. Szkoły, kościoły i uczelnie mają opcję „🐉 Zapytaj o cienie”; połowa z nich coś wie i odsyła na uczelnię albo do ratusza.
- **Mag Albrecht** (poza Lublinem wędrowny mędrzec, imię zależne od kraju) rozmawia od 5. poziomu postaci i wskazuje miejsce smoka, 0,5–6 km dalej.
- Wybór przy smoku: **walka** (tytuł „Pogromca smoka”) albo **rozmowa** (4 strony, potem melodia smoków na fujarce – „Brat smoków”). Tytuł widać w HUD; jest też obrazek „📸 Pochwal się”.
- Lore v1.1 (`docs/swiat-dla-autora.md`): Wielka Wojna o Tryby, kometa → Pęknięcie Magii, Rdza Umysłu.

## Postacie stałe (Lublin i okolice)
- **Pies** (Guliwera/Cyda) – szuka świnki w krzakach przy placu zabaw, +100 EXP raz.
- **Siostra Margo** (Orlanda) – zagadka przy 3. rozmowie dnia, potem 2 zagadki o dobrych manierach.
- **Dziadek Marek / babcia Iwonka** (Jana Śnieżyńskiego 19–27, zależnie od dnia) – jedna zagadka naukowa dziennie, 50 EXP.
- **Babcia Grażynka** (Kościelna, Garbów) – 500 owoców → narzędzia ze sklepu → 3 zagadki botaniczne → 200 monet + 500 EXP; potem skupuje owoce.
- **Luigi** (Nałęczowska, hiszpańskojęzyczny macho) – 3 zagadki dziennie: szachy, Pokémon / Magic: the Gathering; zaprasza do tawerny magicownia.pl.
- **Martin** (Irysowa) – mówi, że cień to smok i odsyła do maga; zadanie „Zmarznięty smok” (15 drewna), po którym kocioł w Lublinie zaczyna świecić.

## Misje i zlecenia
- Misje pisane przez właściciela, po adresach: `src/content/fabula.ts`, np. „Rury na ratuszu” i „Tajemnica stacji” (podkowa szczęścia + zniżka u woźnicy). Misje z panelu admina leżą w bazie (tabela `missions`). Przy dodawaniu sprawdzamy, czy adresy istnieją na mapie.
- Kościoły i urzędy dają losowe zlecenia (pokonaj, dojdź, przynieś grzyby lub drewno); policja daje listy gończe (ukryty bandyta, wielki chochlik); biblioteki – wyprawy do wsi 2–30 km dalej.
- Mieszkańcy: 10% z nich prosi o pomoc (chochliki ukradły coś i uciekły w pole). Za pomoc 20 monet + 40 EXP, ta sama osoba prosi najwyżej raz dziennie. Niektórzy wyzywają na pojedynek. W nowym mieście 1. i 3. zagadnięty mówi, gdzie jesteśmy.
- Mądrale: prośby „z życia” (kuchnia, zwierzęta, daty, odległości), ta sama nie wraca przez 60 dni.
- Najwyżej **3 zadania naraz**, każde z własnym kolorem strzałki; dziennik zadań jest w karcie postaci.

## Zagadki i quizy
- **Szkoły**: 50 pytań dziennie w każdej szkole, lekcje po 10 i przerwa 3 min. Od 31. pytania o poziom trudniej, od 41. o dwa. 10 EXP za dobrą odpowiedź.
- Pytania z bazy: paczki ważne 5 dni, zapas starych (najpierw bez odpowiedzi), a gdy brak pytań – więcej rachunków.
- **Gemini**: zakładka „🧠 Quizy” w panelu (polecenie, schemat JSON, wklejanie, usuwanie złych pytań); opis w `docs/quizy-gemini.md`. Poziomy: 0 maluch (5–7), 1 uczeń (8–9), 2 odkrywca (10–12), 3 mędrzec. Pierwsza odpowiedź zawsze dobra.
- Biblioteki: 3 zagadki bibliotekarki na sesję.

## Pomysły czekające (ze zgłoszeń, do decyzji właściciela)
- Album wielkich osiągnięć (szczyty, dalekie miasta), do wysyłania.
- Rolnicy na polach, gonią z widłami, gdy zrywasz za dużo (10% szans przy każdym zerwaniu).
- Ożywienie dróg między miastami; prom w portach.
- Niespodzianki do reklamy (np. miecz nad Zalewem Zemborzyckim, coś klimatycznego w Krakowie i Warszawie).
- Zadanie nie może pojawiać się tuż obok bohatera; nagroda nie powinna być znana z góry.
- Różne ostrzeżenia przy wejściu do gangu, zależne od liczby i rodzaju wrogów.
- Jeszcze nie zrobione z lore: Tępy Miecz, smary, regiony (strefa domu 5 km ważniejsza niż region Wschód).
