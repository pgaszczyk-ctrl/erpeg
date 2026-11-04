ID: 38-P002
Odpowiedź na: próba areny (zrzut od właściciela, 18.10.2026)
Od: programista
Do: grafik
Status: nowe
Akceptacja: czeka na właściciela
Wykonanie: –
Dotyczy: Arena Cechu – uwagi do pierwszej próby areny (38_arena/proba_1_od_grafika.png)

# Arena – uwagi do próby

Klimat jest dobry: drewniane trybuny, mosiężna barierka, brama z tabliczką, chorągwie, kratki z parą, widzowie. Zostawiamy styl. Żeby dało się to wstawić do gry:

1. **Kąt patrzenia.** W grze patrzymy prawie z góry (jak na budynki i dachy), a nie z boku. Płyta ma być okręgiem lekko spłaszczonym (szerokość : wysokość ok. 1 : 0,85), nie płaską elipsą 2 : 1. Trybuny i ściany „stoją” w górę ekranu, jak ściany domów.
2. **Rozmiar.** Piaszczysta płyta ma średnicę ok. 18 wzrostów bohatera. Bohater w obrazku ma ok. 26 px, więc płyta ok. 480 px, cały obrazek z trybunami ok. 640 × 600 px. Piksele w gęstości ludzików (tak jak bohater, nie drobniej).
3. **Trzy osobne warstwy (PNG z przezroczystym tłem, ten sam rozmiar i to samo położenie):**
   - `arena_plyta` – sam piasek z grabionymi kręgami, **pusty środek** (tam gra kładzie herb miasta albo logo). Bez kratek z parą;
   - `arena_tyl` – trybuny, brama, barierka w górnej połowie (wszystko, co jest ZA walczącymi);
   - `arena_przod` – dolny łuk barierki i trybun (to, co jest PRZED walczącymi). Najlepiej niski, żeby nie zasłaniał postaci przy dolnej krawędzi.
4. **Widzowie** jako osobna warstwa `arena_widzowie` w 2 klatkach: siedzą / wiwatują (ręce w górze). Gra przełącza klatki przy ciosach.
5. **Tabliczka nad bramą pusta** – nazwę miasta wpisuje gra. Chorągwie przy bramie: osobny mały obrazek `arena_choragiew` (szary, z maską), żeby gra mogła wstawić flagę kraju albo herb miasta.
6. **Kratki z parą**: osobny mały obrazek `arena_kratka` (sama kratka); parę animuje gra.
7. **Wejście dolne** (przerwa w barierce) może zostać – tam bohater wchodzi.
8. Tło przezroczyste, bez czarnego. Paleta i obrys 1 px #1e1a24 jak u ludzików.

Najpierw próba samej warstwy `arena_tyl` + `arena_plyta` w nowym kącie – wstawię ją na serwer testowy i pokażę zrzut z walki.
