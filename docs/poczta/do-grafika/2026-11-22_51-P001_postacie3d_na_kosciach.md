# 51-P001 – sześć postaci 3D „na kościach” z gotowymi ruchami

ID: 51-P001
Odpowiedź na: —
Od: programista
Do: grafik (generator)
Status: nowe
Akceptacja: właściciel zamówił 22.11.2026 („chcę męskiego i żeńskiego strażnika, tak samo maga i łucznika”)
Wykonanie: —
Dotyczy: bohater w grze (dziś `public/modele/straznik.glb` + `public/modele/postacie3d/*.glb`)

Materiał pomocniczy:
- `51_postacie_kosci/obecny_model_bieg_przed_po.png` pokazuje obecny model w biegu. Obecny model składa się z 14 sztywnych klocków bez kości, dlatego ramiona się nie zginają, a barki stoją sztywno. Nowe modele mają to rozwiązać.
- `scripts/model3d/straznik_podglad.html` to podgląd obecnego strażnika. **Styl chibi zostaje.**

---

## Prompt do wklejenia

> Zaprojektuj i wykonaj **sześć oryginalnych postaci 3D** do mobilnej gry przygodowej oglądanej z góry pod kątem. Postacie to: **strażnik, strażniczka, mag, magini, łucznik, łuczniczka**. Wszystkie mają **jeden wspólny szkielet** i **jeden wspólny zestaw animacji**. Animacje mają być płynne, przesadzone i kreskówkowe, jak w najlepszych grach mobilnych typu „brawler”. Postacie muszą być własne: nie kopiuj postaci, strojów ani pomysłów z żadnej istniejącej gry.
>
> ### Świat i nastrój
> Prawdziwe współczesne miasto z lekką, bajkową nutą steampunku: mosiądz, skóra, nity, para, lampy gazowe, mundury straży miejskiej. Ma być ciepło, kolorowo i przyjaźnie. Klimat ma być lekko przygodowy: nie mroczny i nie infantylny. Bez symboli religijnych, bez szarości jako koloru przewodniego, bez brudu i zniszczenia.
>
> ### Proporcje: chibi jak obecny strażnik
> - Wzrost postaci to około **4 głowy**. **Głowa (z nakryciem) zajmuje ok. 45–55 % wysokości.** Tułów jest krótki i krępy, ręce i nogi krótkie i grube, dłonie i stopy wyraźnie powiększone.
> - **Bez widocznej szyi**: głowa siedzi na tułowiu. **Barki są jednak opuszczone i zaokrąglone**, a ręce wychodzą wyraźnie pod linią brody. Barki nie mogą stać kanciasto pod uszami, bo to był główny błąd obecnego modelu.
> - Kobieta i mężczyzna tej samej profesji mają ten sam wzrost i tę samą budowę szkieletu. Różnią się fryzurą, twarzą, krojem stroju i nieco węższymi barkami lub talią, ale animacje muszą pasować na oboje bez poprawek.
>
> ### Sylwetka: każda profesja rozpoznawalna jako czarna plama
> Postać ma ok. 50 pikseli wysokości na ekranie telefonu i jest widziana z góry pod kątem 22°. Profesję trzeba rozpoznać po samym kształcie, więc znaki profesji mają być **przesadnie duże**:
> - **Strażnik / strażniczka:** mosiężny hełm z szerokim rondem (strażniczka może mieć hełm z kitą lub z warkoczem wystającym spod ronda), granatowy mundur z mosiężnymi guzikami i skórzanym pasem z klamrą. Miecz trochę za duży, opcjonalnie mała okrągła tarcza na plecach.
> - **Mag / magini:** wysoki, przekrzywiony kapelusz z szerokim rondem i mosiężną klamrą lub zębatką. Długi płaszcz do kolan, rozszerzony u dołu. Różdżka z mosiężną oprawą i świecącym kryształem (zielono-turkusowy albo bursztynowy). Magini może mieć długie włosy spod kapelusza. Bez brody, bo mag jest młody.
> - **Łucznik / łuczniczka:** kaptur z długim „ogonem” albo zawadiacki kapelusz z piórem, krótka peleryna, skórzany kaftan, karwasz na przedramieniu. **Kołczan ze strzałami na plecach, wyraźnie widoczny z góry.** Duży, zakrzywiony łuk.
> - Każda postać ma **jeden kolor przewodni i jeden akcent** (strażnik: granat + mosiądz, mag: np. śliwkowy fiolet + turkus, łucznik: zieleń leśna + rdzawy brąz). Kolory nasycone, z wyraźnym kontrastem jasne/ciemne, bez pastelowej mgiełki.
>
> ### Wygląd powierzchni
> - Niska liczba wielokątów, **płaskie cieniowanie**, kolory jako **kolory wierzchołków albo jedna mała tekstura-paleta** (maks. 64×64, bez gradientów). Bez PBR, map normalnych, połysków i realistycznych materiałów.
> - Kolory muszą być **czyste i jednolite w obrębie jednej strefy**. Gra sama przebarwia skórę, włosy, mundur i spodnie, więc te strefy muszą mieć **osobne materiały** o nazwach: `skora`, `wlosy`, `stroj` (kolor przewodni), `spodnie`. Reszta może mieć dowolne nazwy: `mosiadz`, `skora_brazowa`, `metal`, `bron`, `oczy`, …
> - Twarz prosta i czytelna z daleka: duże ciemne oczy, krótkie brwi, bez drobnych detali.
>
> ### Szkielet (rig)
> - **Jeden szkielet dla wszystkich sześciu postaci**, z tymi samymi nazwami kości i tą samą pozycją spoczynkową. Animację zrobioną dla jednej postaci musi się dać od razu użyć na pozostałych.
> - Kości (dokładnie te nazwy): `root` (między stopami, na ziemi), `hips`, `spine`, `chest`, `head`, `shoulder_L/R`, `upperarm_L/R`, `forearm_L/R`, `hand_L/R`, `thigh_L/R`, `shin_L/R`, `foot_L/R`. Opcjonalnie `toe_L/R`, `hat` (np. kołysanie ronda lub kity), `cape` (1–3 kości peleryny lub płaszcza), `hair` (warkocz lub kita).
> - **Kości-uchwyty** (bez wag, tylko do podpinania przedmiotów): `grip_R` (w prawej dłoni, miecz, różdżka), `grip_L` (lewa dłoń, łuk, tarcza), `back` (plecy, kołczan, tarcza), `head_top` (czubek głowy, zamienne nakrycia głowy).
> - **Broń jest osobnym obiektem** (`Weapon`), podpiętym pod właściwy uchwyt, a nie wtopionym w dłoń. Łuk ma cięciwę w dwóch częściach (`BowStringTop`, `BowStringBottom`), żeby dało się pokazać naciąganie.
> - Skinning: maks. 4 kości na wierzchołek, **gładkie wagi przy łokciach, kolanach, barkach i biodrach** (2–3 pętle krawędzi w każdym stawie), żeby zgięcie było okrągłe i nic się nie zapadało ani nie rozrywało. Pozycja spoczynkowa to lekkie A (ręce ok. 30–40° od tułowia).
>
> ### Animacje
> Wszystkie animacje **w miejscu** (bez przesuwania postaci do przodu, bo ruch po mapie robi gra), 30 klatek/s, z dokładnie takimi nazwami. Ruchy mają być przesadzone, kreskówkowe i czytelne z góry: przygotowanie (zamach), mocna poza w kulminacji, lekkie przestrzelenie i powrót, łuki ruchu zamiast prostych linii, krótkie zatrzymania na pozach kluczowych. Gra pokazuje postać w ~20 klatkach na sekundę, więc pozy muszą być wyraźne, a nie rozmyte w drobnym drganiu.
>
> | Nazwa | Długość | Pętla | Opis |
> |---|---|---|---|
> | `idle` | 2–3 s | tak | Oddech, lekkie przenoszenie ciężaru, mrugnięcie. Każda profesja z charakterem: strażnik stoi pewnie, mag lekko kręci różdżką, łucznik przestępuje z nogi na nogę. |
> | `run` | 0,6–0,7 s (2 kroki) | tak | Bieg, nie marsz. Ręce pracują **przeciwnie do nóg**, łokcie zgięte 70–90°, pięści przed tułowiem przy wymachu do przodu. Tułów lekko pochylony **od bioder** (5–8°), lekki skręt klatki z każdym krokiem, wyraźne podbicie w górę (przez chwilę obie stopy nad ziemią). |
> | `walk` | 0,9–1 s | tak | Spokojny chód (do rozmów i w mieście). |
> | `attack_1` | 0,45–0,55 s | nie | Cięcie z prawej do lewej. Zamach, uderzenie, powrót. |
> | `attack_2` | 0,45–0,55 s | nie | Cięcie odwrotne, z lewej do prawej (backhand). Musi płynnie wychodzić z końca `attack_1`. |
> | `attack_3` | 0,6–0,7 s | nie | Mocny cios znad głowy, w dół, z lekkim przysiadem i wykrokiem. Musi płynnie wychodzić z końca `attack_2`. |
> | `bow_shot` | 0,9–1,1 s | nie | Sięgnięcie do kołczana, nałożenie strzały, naciągnięcie z przytrzymaniem, puszczenie z odrzutem. |
> | `cast` | 0,7–0,9 s | nie | Zamach różdżką, pchnięcie lub wskazanie przed siebie, druga ręka otwarta dla równowagi, krótkie zatrzymanie. |
> | `hit` | 0,3 s | nie | Odchylenie do tyłu po trafieniu, grymas, szybki powrót. |
> | `death` | 1,0–1,4 s | nie | Zachwianie i miękki, kreskówkowy upadek na plecy lub bok. Ostatnia klatka leży na ziemi. Bez krwi i makabry. |
> | `strong_windup` | 0,5 s | tak | Ładowanie mocnego ciosu: broń odciągnięta, postać napięta, lekkie drżenie. |
> | `dodge` | 0,4 s | nie | Odskok w bok lub przewrót, w miejscu. |
> | `interact` | 0,6 s | nie | Sięgnięcie ręką przed siebie (drzwi, rozmowa, podniesienie przedmiotu). |
> | `cheer` | 1,0 s | nie | Radość po zwycięstwie lub awansie. |
>
> Ważne zasady animacji:
> 1. **Wszystkie postacie mają wszystkie animacje.** Mag też może ciąć mieczem, a strażnik strzelać z łuku, bo broń zmienia się w grze. Broń w `attack_*` trzymamy w `grip_R`, w `bow_shot` łuk w `grip_L`, w `cast` różdżkę w `grip_R`.
> 2. **Ataki muszą się dać nałożyć na bieg.** W `attack_1/2/3`, `bow_shot`, `cast`, `hit` i `interact` nogi i biodra mają stać w spokojnej, rozkrocznej pozie, a cały ruch robi tułów od `spine` w górę. Gra bierze nogi z `run`, a górę z ataku.
> 3. **Moment trafienia lub wypuszczenia** podaj w klatkach dla każdej animacji (metadane poniżej). Dla `attack_1/2/3` ma przypadać **ok. 40 % długości**.
> 4. Brak skalowania kości (tylko obroty, plus przesunięcie `hips` w pionie przy podbiciu). Brak IK ani constraintów w pliku: wszystko wypalone w klatkach.
>
> ### Format i liczby
> - **glTF 2.0 binarnie (.glb)**, jeden plik na postać: `straznik_m.glb`, `straznik_k.glb`, `mag_m.glb`, `mag_k.glb`, `lucznik_m.glb`, `lucznik_k.glb`. W każdym siatka, szkielet, broń swojej profesji i wszystkie animacje.
> - Oś Y w górę, **postać patrzy w +Z**, punkt zerowy między stopami na ziemi, skala zastosowana (1,0), wzrost **1,25 jednostki**.
> - Maks. **3000 trójkątów** na postać (bez broni), broń maks. 500. Maks. 32 kości z uchwytami.
>
> ### Co oddać
> 1. Sześć plików `.glb` jak wyżej.
> 2. `metadane.json`: dla każdej postaci wzrost, lista kości, nazwy materiałów i ich kolory, a dla każdej animacji długość w klatkach i **klatka kontaktu lub wypuszczenia**.
> 3. **Arkusz podglądu w skali gry** dla każdej postaci i animacji: kamera ortograficzna z góry pod kątem 22° od poziomu, postać ok. **54 px wysokości** w kratce 64 px, na tle piaskowo-ciepłym (#c9b48a), co 3. klatka obok siebie. Do tego to samo powiększone ×4 (najbliższy sąsiad).
> 4. Zestawienie sześciu postaci obok siebie w pozie `idle`, w skali gry, oraz jako czarne sylwetki (test rozpoznawalności).
> 5. Krótki obrotowy podgląd (GIF lub HTML) każdej postaci.
>
> ### Kolejność: najpierw próba
> **Etap 1 (próba):** tylko **strażnik (mężczyzna)** z animacjami `idle`, `run` i `attack_1`, plik `.glb` oraz arkusz w skali gry. Właściciel ocenia proporcje, barki, zgięcie łokci i płynność biegu. Dopiero po akceptacji powstaje reszta.
> **Etap 2:** komplet animacji dla strażnika i strażniczki.
> **Etap 3:** mag, magini, łucznik, łuczniczka.
>
> ### Czego unikać
> - Kanciastych barków pod uszami, cienkich patyczkowatych kończyn, rąk i nóg odstających jak osobne klocki.
> - Ostrych zagięć w stawach, przenikania rękawów przez tułów w biegu.
> - Szarej, mrocznej palety i realistycznych tekstur. Drobnych detali, które zginą przy 50 px.
> - Wtapiania broni w dłoń na stałe i przesuwania postaci w animacjach (root motion).
> - Kopiowania postaci z istniejących gier.

---

## Uwagi dla programisty (do integracji po dostawie)
- `src/ludzik3d.ts` przejdzie z „sztywnych części + ręczne obroty” na `SkinnedMesh`. Wtedy znikają `wzmocnij`, `receWBiegu` i stawy liczone w `src/ludzik3dPoza.ts`: ruch daje animacja.
- Nogi z `run`, górę z ataku: dziś rozdzielamy ścieżki po nazwach części (`thigh|shin|foot`). Przy kościach podział po `thigh_*`, `shin_*`, `foot_*`, `hips`.
- Przebarwianie (`src/przebarwienie3d.ts`) przejdzie z klasyfikacji kolorów wierzchołków na materiały `skora`/`wlosy`/`stroj`/`spodnie`.
- Broń z `grip_R`/`grip_L`, kapelusze pod `head_top`, kołczan pod `back`.
