# 40 schematów — archiwum do konsultacji

**Status: propozycje z odrzuconego podejścia. Nie stanowią akceptacji ani instrukcji wdrożenia.**

Źródło: `src/content/questy/catalog.json`, commit `29d1b12f1935f31ee57b68019ae865befc4bf3c1`. Opisy reguł po polsku są redakcyjnym tłumaczeniem pól `completionRule`; identyfikatory, role miejsc, wejścia/wyjścia i dialogi pochodzą z katalogu. Żaden z 40 modułów nie jest deklarowany jako gotowy, dowolnie składany komponent silnika.

Role poniżej to wymagania dla mapy, nie konkretne adresy. Wariant zastępczy ma być jawny i zgodny z sensem zadania; brak odpowiednich miejsc może wykluczać schemat. Nie każda mapa ma jezioro, most lub szczyt.

| ID | Nazwa | Rodzina | Mechanika |
|---|---|---|---|
| module.01 | Gdzie zniknął gwizdek? | Dedukcja | `location_deduction` |
| module.02 | Trzy namiary | Dedukcja | `sector_intersection` |
| module.03 | Każdy widział co innego | Dedukcja | `evidence_comparison` |
| module.04 | Posłaniec bez adresu | Planowanie | `next_stop_prediction` |
| module.05 | Kartograf i kleks | Dedukcja | `map_symbol_correction` |
| module.06 | Drogowskaz po poprawkach | Dedukcja | `seal_recognition` |
| module.07 | Wiadomość w trybach | Dedukcja | `symbol_order` |
| module.08 | Sprawa bez winowajcy? | Dedukcja | `case_resolution` |
| module.09 | Dwie pieczęcie wystarczą | Planowanie | `choose_two_of_three` |
| module.10 | Latarnia na krótkiej smyczy | Planowanie | `limited_map_navigation` |
| module.11 | Pętla, która świeci | Planowanie | `circuit_route` |
| module.12 | Miasto na trzy nuty | Planowanie | `sequence_and_melody` |
| module.13 | Trzy oblicza okolicy | Planowanie | `environment_route` |
| module.14 | Na skróty czy z ciekawości? | Planowanie | `route_tradeoff` |
| module.15 | Co nuci po drugiej stronie? | Planowanie | `bank_comparison` |
| module.16 | Plan dla małych kółek | Planowanie | `constraint_route_design` |
| module.17 | Akumulator lubi przerwy | Planowanie | `distance_resource` |
| module.18 | Jedna fiolka, kilka pomysłów | Narzędzia i zasoby | `exclusive_tool_choice` |
| module.19 | Manometr ma swoje zdanie | Narzędzia i zasoby | `instrument_diagnosis` |
| module.20 | Przepis bez szczypty przypadku | Narzędzia i zasoby | `recipe_selection` |
| module.21 | Naprawa z przerwą na myślenie | Narzędzia i zasoby | `repair_after_puzzle` |
| module.22 | Komu trochę pary? | Narzędzia i zasoby | `energy_allocation` |
| module.23 | Mocniej czy dokładniej? | Narzędzia i zasoby | `tool_mode_choice` |
| module.24 | Dwa miejsca w pudełku | Narzędzia i zasoby | `two_slot_selection` |
| module.25 | Nie każdy ryk to groźba | Spotkania | `behaviour_interpretation` |
| module.26 | Wabik na dobrym miejscu | Spotkania | `bait_position` |
| module.27 | Pojedynek o spokojną pracę | Spotkania | `conditional_encounter` |
| module.28 | Strażnik i instrukcja | Spotkania | `knowledge_based_guardian` |
| module.29 | Towarzysz z pytaniami | Spotkania | `companion_stops` |
| module.30 | Sąsiedzi i jeden zawór | Spotkania | `evidence_mediation` |
| module.31 | Klucz tylko jeden | Spotkania | `priority_and_alternative` |
| module.32 | Targ bez sakiewki | Spotkania | `bounded_trade_chain` |
| module.33 | Ogródek z charakterem | Konsekwencje | `garden_choice` |
| module.34 | Mozaika po drzemce | Konsekwencje | `mosaic_reconstruction` |
| module.35 | Kronika bez pomieszanych stron | Konsekwencje | `story_reconstruction` |
| module.36 | Miejsce przy warsztacie | Konsekwencje | `resident_service_choice` |
| module.37 | Latarnie zaczynają rozmawiać | Konsekwencje | `personal_network` |
| module.38 | Warsztat wielu rąk | Konsekwencje | `community_contribution` |
| module.39 | Dzisiaj pokazuje inaczej | Dedukcja | `historical_reading_comparison` |
| module.40 | Ten znak już znam | Konsekwencje | `history_callback` |

## module.01 — Gdzie zniknął gwizdek?

- Rodzina: Dedukcja; mechanika: `location_deduction`.
- Role miejsc: `square`, `park`, `waterfront`.
- Potrzebne wejścia: `candidate_clues`.
- Wynik dla kolejnego etapu: `target_location`.
- Reguła ukończenia: Jedno z trzech osiągalnych miejsc spełnia wszystkie podane wskazówki. Błędne miejsce daje informację zwrotną bez kary.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.01.title`) | Gdzie zniknął gwizdek? | Where Did the Whistle Go? | nie / nie |
| start (`module.01.start`) | Gwizdek zostawiłem przy miejscu z ławką i dwiema latarniami. Na szkicu oznaczyłem trzy możliwości. | I left the whistle by a bench with two lanterns. I marked three possibilities on the sketch. | nie / nie |
| hint (`module.01.hint`) | Porównaj wszystkie znaki na szkicu. Jedno miejsce pasuje do całego opisu. | Compare every symbol on the sketch. Only one place matches the whole description. | nie / nie |
| done (`module.01.done`) | Jest! Teraz mogę gwizdać na przerwę, zamiast udawać czajnik. | Found it! Now I can signal break time without pretending to be a kettle. | nie / nie |

## module.02 — Trzy namiary

- Rodzina: Dedukcja; mechanika: `sector_intersection`.
- Role miejsc: `square`, `landmark`, `park`.
- Potrzebne wejścia: `bearing_cards`.
- Wynik dla kolejnego etapu: `search_area`.
- Reguła ukończenia: Przecięcie trzech podanych sektorów wskazuje jeden osiągalny obszar. Namiary są fikcyjnymi danymi gry.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.02.title`) | Trzy namiary | Three Bearings | nie / nie |
| start (`module.02.start`) | Z trzech odbiorników dochodzi ten sam sygnał. Każdy wskazuje inny pas mapy. | Three receivers picked up the same signal. Each points to a different strip of the map. | nie / nie |
| hint (`module.02.hint`) | Szukaj części mapy wspólnej dla wszystkich trzech pasów. | Find the area shared by all three strips. | nie / nie |
| done (`module.02.done`) | Sygnał jest właśnie tutaj. Odbiorniki wreszcie zgadzają się ze sobą. | The signal is right here. The receivers finally agree. | nie / nie |

## module.03 — Każdy widział co innego

- Rodzina: Dedukcja; mechanika: `evidence_comparison`.
- Role miejsc: `shop`, `square`, `station`, `npc`.
- Potrzebne wejścia: `witness_statements`, `evidence`.
- Wynik dla kolejnego etapu: `verified_clue`.
- Reguła ukończenia: Wskaż wypowiedź sprzeczną z dowodami. Dowody i zeznania trzeba przygotować jako jedną spójną sprawę.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.03.title`) | Każdy widział co innego | Everyone Saw Something Different | nie / nie |
| start (`module.03.start`) | Jedni mówią o smoku, inni o wielkim kapeluszu. Sprawdźmy najpierw ślady. | Some say it was a dragon. Others say it was a very large hat. Let us check the evidence first. | nie / nie |
| hint (`module.03.hint`) | Zeznanie musi pasować do czasu zdarzenia i do znalezionego śladu. | A statement must match both the time of the incident and the evidence. | nie / nie |
| done (`module.03.done`) | Czyli tę opowieść trzeba poprawić. Resztę możemy sprawdzić dalej. | That account needs correcting. We can follow up on the rest. | nie / nie |

## module.04 — Posłaniec bez adresu

- Rodzina: Planowanie; mechanika: `next_stop_prediction`.
- Role miejsc: `road_junction`, `square`.
- Potrzebne wejścia: `route_evidence`.
- Wynik dla kolejnego etapu: `next_anchor`.
- Reguła ukończenia: Z dwóch śladów i jawnej reguły ruchu wywnioskuj następny punkt. Bez pościgu na czas.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.04.title`) | Posłaniec bez adresu | A Messenger Without an Address | nie / nie |
| start (`module.04.start`) | Mały posłaniec zgubił adres, ale zostawił odbicia kół. Da się odgadnąć jego następny przystanek. | The little messenger lost the address, but left wheel marks. We can work out its next stop. | nie / nie |
| hint (`module.04.hint`) | Porównaj dwa ostatnie przystanki z zasadą zapisaną na karcie trasy. | Compare the last two stops with the rule on the route card. | nie / nie |
| done (`module.04.done`) | Znaleźliśmy kolejny przystanek. I posłańca, który bardzo się z tego cieszy. | We found the next stop. And a messenger who is very pleased about it. | nie / nie |

## module.05 — Kartograf i kleks

- Rodzina: Dedukcja; mechanika: `map_symbol_correction`.
- Role miejsc: `square`, `park`, `road_junction`.
- Potrzebne wejścia: `fictional_sketch`, `revealed_anchors`.
- Wynik dla kolejnego etapu: `corrected_map`.
- Reguła ukończenia: Popraw jeden symbol szkicu gry względem już odkrytych miejsc. Bez zmiany rzeczywistej mapy i odsłaniania mgły.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.05.title`) | Kartograf i kleks | The Cartographer and the Inkblot | nie / nie |
| start (`module.05.start`) | Na mój szkic kapnęła herbata. Teraz most wygląda jak piekarnia. Poprawisz jeden znak? | I spilled tea on my sketch. Now the bridge looks like a bakery. Could you correct one symbol? | nie / nie |
| hint (`module.05.hint`) | Porównaj szkic z miejscami, które już znasz. Nie trzeba odkrywać całej okolicy. | Compare the sketch with places you already know. You do not need to uncover the whole area. | nie / nie |
| done (`module.05.done`) | Most znów jest mostem. Piekarz też odetchnął z ulgą. | The bridge is a bridge again. The baker is relieved too. | nie / nie |

## module.06 — Drogowskaz po poprawkach

- Rodzina: Dedukcja; mechanika: `seal_recognition`.
- Role miejsc: `road_junction`, `square`.
- Potrzebne wejścia: `known_seal`, `route_candidates`.
- Wynik dla kolejnego etapu: `trusted_route`.
- Reguła ukończenia: Dopasuj pokazaną wcześniej pieczęć do karty trasy. Pomyłka daje podpowiedź na miejscu, zamiast odległego objazdu.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.06.title`) | Drogowskaz po poprawkach | An Edited Signpost | nie / nie |
| start (`module.06.start`) | Ktoś domalował strzałki. Prawdziwe oznaczenia mają pieczęć warsztatu. | Someone added extra arrows. The genuine signs carry the workshop seal. | nie / nie |
| hint (`module.06.hint`) | Sprawdź znak, którego nauczył cię kartograf. | Check the symbol the cartographer showed you. | nie / nie |
| done (`module.06.done`) | Tę drogę możemy uznać za sprawdzoną. Reszta strzałek niech odpocznie. | We can trust this route. The other arrows can take a rest. | nie / nie |

## module.07 — Wiadomość w trybach

- Rodzina: Dedukcja; mechanika: `symbol_order`.
- Role miejsc: `landmark`, `bridge`, `park`, `square`.
- Potrzebne wejścia: `rune_cards`, `ordering_rule`.
- Wynik dla kolejnego etapu: `decoded_message`.
- Reguła ukończenia: Ułóż trzy symbole według jawnych cech. Poprawa odbywa się w panelu, bez ponownego przechodzenia trasy.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.07.title`) | Wiadomość w trybach | A Message in the Gears | nie / nie |
| start (`module.07.start`) | Na płytkach są trzy znaki i liczby zębów. Ktoś ukrył w nich kolejność wiadomości. | The plates carry three symbols and gear-tooth counts. Someone hid the message order in them. | nie / nie |
| hint (`module.07.hint`) | Ułóż płytki od najmniejszej liczby zębów do największej. | Arrange the plates from the fewest teeth to the most. | nie / nie |
| done (`module.07.done`) | Wiadomość jest czytelna. Na szczęście nikt nie kazał nam liczyć wszystkich zębatek w mieście. | The message is readable. Luckily, nobody asked us to count every gear in town. | nie / nie |

## module.08 — Sprawa bez winowajcy?

- Rodzina: Dedukcja; mechanika: `case_resolution`.
- Role miejsc: `npc`, `shop`, `square`.
- Potrzebne wejścia: `case_evidence`, `verified_clue`.
- Wynik dla kolejnego etapu: `resolved_case`.
- Reguła ukończenia: Wybierz wyjaśnienie zgodne ze wszystkimi faktami. Bez nieuzasadnionych oskarżeń i losowej oceny.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.08.title`) | Sprawa bez winowajcy? | A Case Without a Culprit? | nie / nie |
| start (`module.08.start`) | Mamy już ślady. Zdecyduj, które wyjaśnienie pasuje do wszystkich. | We have the evidence. Decide which explanation fits every clue. | nie / nie |
| hint (`module.08.hint`) | Awaria, pomyłka i psota to różne rzeczy. Dowody mają rozstrzygnąć. | A fault, a mistake and a prank are different things. Let the evidence decide. | nie / nie |
| done (`module.08.done`) | Sprawa wyjaśniona. Możemy naprawić problem zamiast szukać winnego na siłę. | Case solved. We can fix the problem instead of insisting on finding someone to blame. | nie / nie |

## module.09 — Dwie pieczęcie wystarczą

- Rodzina: Planowanie; mechanika: `choose_two_of_three`.
- Role miejsc: `station`, `office`, `shop`, `npc`.
- Potrzebne wejścia: `seal_options`.
- Wynik dla kolejnego etapu: `seal_pair`.
- Reguła ukończenia: Wybierz dowolne dwa różne, osiągalne punkty. Każda z trzech par jest poprawna i ma zapowiedziany inny wynik.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.09.title`) | Dwie pieczęcie wystarczą | Two Seals Will Do | nie / nie |
| start (`module.09.start`) | Potrzebuję dwóch odczytów. Możesz wybrać dowolne dwa z trzech zaznaczonych miejsc. | I need two readings. Choose any two of the three marked places. | nie / nie |
| hint (`module.09.hint`) | Przed wyborem sprawdź długość drogi i efekt każdej pary. | Check the route length and the effect of each pair before choosing. | nie / nie |
| done (`module.09.done`) | Dwie pieczęcie, komplet danych. Trzecia może spokojnie poczekać. | Two seals, a complete set of data. The third can wait. | nie / nie |

## module.10 — Latarnia na krótkiej smyczy

- Rodzina: Planowanie; mechanika: `limited_map_navigation`.
- Role miejsc: `connected_roads`, `park`.
- Potrzebne wejścia: `known_goal`, `lamp_budget`.
- Wynik dla kolejnego etapu: `revealed_corridor`.
- Reguła ukończenia: Dotrzyj do znanego celu korytarzem stopniowo odkrywanym w grze. Zachowaj drogę wyjścia i możliwość odzyskania energii.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.10.title`) | Latarnia na krótkiej smyczy | A Lantern With a Short Reach | nie / nie |
| start (`module.10.start`) | Ta latarnia rozświetla tylko kawałek mapy. Wybieraj kolejne odcinki, aż dotrzemy do celu. | This lantern lights only a small part of the map. Choose each next stretch until we reach the destination. | nie / nie |
| hint (`module.10.hint`) | Sprawdź połączenia przed wyborem. Zawsze możesz wrócić do ostatniego znanego punktu. | Check the connections before choosing. You can always return to the last known point. | nie / nie |
| done (`module.10.done`) | Droga odkryta. Latarnia jest mała, ale dobrze się spisała. | Route discovered. The lantern is small, but it did a fine job. | nie / nie |

## module.11 — Pętla, która świeci

- Rodzina: Planowanie; mechanika: `circuit_route`.
- Role miejsc: `connected_loop`.
- Potrzebne wejścia: `three_nodes`, `start_anchor`.
- Wynik dla kolejnego etapu: `closed_circuit`.
- Reguła ukończenia: Odwiedź trzy węzły i wróć do początku po sprawdzonej pętli. Ten moduł celowo wymaga powrotu.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.11.title`) | Pętla, która świeci | A Loop That Lights Up | nie / nie |
| start (`module.11.start`) | Trzy punkty tworzą obwód. Odwiedź każdy i zamknij pętlę tutaj. | Three points form a circuit. Visit each one, then close the loop here. | nie / nie |
| hint (`module.11.hint`) | Możesz wybrać kierunek. Obie strony prowadzą po sprawdzonej trasie. | Choose either direction. Both follow a verified route. | nie / nie |
| done (`module.11.done`) | Obwód zamknięty. Lampka świeci, a my wiemy, którędy wracać. | Circuit closed. The lamp is glowing, and we know the way back. | nie / nie |

## module.12 — Miasto na trzy nuty

- Rodzina: Planowanie; mechanika: `sequence_and_melody`.
- Role miejsc: `square`, `park`, `waterfront`, `npc`.
- Potrzebne wejścia: `tone_cards`, `sequence_rule`.
- Wynik dla kolejnego etapu: `resonance_pattern`.
- Reguła ukończenia: Zbierz do trzech kart tonów i odtwórz podaną kolejność. Po błędzie powtarza się melodię, bez ponownej podróży.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.12.title`) | Miasto na trzy nuty | A Town in Three Notes | nie / nie |
| start (`module.12.start`) | Trzy urządzenia nucą fragmenty jednej melodii. Odczytaj ich oznaczenia i złóż całość. | Three devices hum parts of one tune. Read their labels and put it together. | nie / nie |
| hint (`module.12.hint`) | Kolejność podaje karta. Gdy pomylisz nutę, spróbuj ponownie tutaj. | The card gives the order. If you miss a note, try again right here. | nie / nie |
| done (`module.12.done`) | Wreszcie grają razem. Każde osobno miało bardzo dobre zdanie o sobie. | They are finally playing together. Each had thought rather highly of its solo. | nie / nie |

## module.13 — Trzy oblicza okolicy

- Rodzina: Planowanie; mechanika: `environment_route`.
- Role miejsc: `urban`, `green`, `water_or_view`.
- Potrzebne wejścia: `available_environment_set`.
- Wynik dla kolejnego etapu: `habitat_set`.
- Reguła ukończenia: Odwiedź trzy rzeczywiście obecne typy otoczenia. Brak wody dopuszcza opisany wcześniej wariant widokowy, bez wymyślonego jeziora.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.13.title`) | Trzy oblicza okolicy | Three Sides of the Neighbourhood | nie / nie |
| start (`module.13.start`) | Narysujmy trasę przez trzy różne otoczenia. Chcę sprawdzić, gdzie mój czujnik najlepiej słucha. | Let us plan a route through three different surroundings. I want to see where my sensor listens best. | nie / nie |
| hint (`module.13.hint`) | Wybieramy miejsca obecne na tej mapie. Brak jeziora nie jest usterką. | Choose places that actually exist on this map. A missing lake is not a fault. | nie / nie |
| done (`module.13.done`) | Mamy trzy różne odczyty i ciekawszą trasę niż prosta od drzwi do drzwi. | We have three different readings and a more interesting route than a straight trip between doors. | nie / nie |

## module.14 — Na skróty czy z ciekawości?

- Rodzina: Planowanie; mechanika: `route_tradeoff`.
- Role miejsc: `two_connected_routes`.
- Potrzebne wejścia: `route_options`, `provided_resource`.
- Wynik dla kolejnego etapu: `route_choice`.
- Reguła ukończenia: Wybierz krótszą trasę zużywającą zasób lub dłuższą dającą informacje. Koszty są jawne; obie drogi wykonalne.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.14.title`) | Na skróty czy z ciekawości? | A Shortcut or a Little Curiosity? | nie / nie |
| start (`module.14.start`) | Są dwie drogi. Krótsza zużyje ładunek lampy. Dłuższa prowadzi obok dodatkowego śladu. | There are two routes. The shorter uses a lantern charge. The longer passes an extra clue. | nie / nie |
| hint (`module.14.hint`) | Obie prowadzą do celu. Wybierz, co teraz bardziej ci się przyda. | Both reach the destination. Choose what is more useful to you now. | nie / nie |
| done (`module.14.done`) | Wybrana droga miała swój sens. Drugą możemy poznać przy innej okazji. | That route had its advantages. We can explore the other another time. | nie / nie |

## module.15 — Co nuci po drugiej stronie?

- Rodzina: Planowanie; mechanika: `bank_comparison`.
- Role miejsc: `two_banks_connected_by_bridge`.
- Potrzebne wejścia: `two_bank_readings`.
- Wynik dla kolejnego etapu: `source_side`.
- Reguła ukończenia: Porównaj dwa odczyty z przeciwnych brzegów, korzystając z przechodniego mostu. Brak wody lub przeprawy wyklucza zadanie.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.15.title`) | Co nuci po drugiej stronie? | What Is Humming Across the Water? | nie / nie |
| start (`module.15.start`) | Odbiornik przy jednym brzegu słyszy sygnał mocniej. Sprawdźmy oba, korzystając z przeprawy. | One bank receiver hears the signal more clearly. Let us check both using the crossing. | nie / nie |
| hint (`module.15.hint`) | Porównaj liczby z obu kart odczytu. Nie trzeba wchodzić do wody. | Compare the numbers on both reading cards. There is no need to enter the water. | nie / nie |
| done (`module.15.done`) | Teraz wiemy, po której stronie szukać źródła. | Now we know which side to search for the source. | nie / nie |

## module.16 — Plan dla małych kółek

- Rodzina: Planowanie; mechanika: `constraint_route_design`.
- Role miejsc: `shop`, `square`, `green`, `npc`.
- Potrzebne wejścia: `route_requirements`, `candidate_anchors`.
- Wynik dla kolejnego etapu: `player_route`.
- Reguła ukończenia: Ułóż dowolną trasę spełniającą warunki kategorii i długości. Oceniaj długość przejścia po grafie, nie odległość w linii prostej.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.16.title`) | Plan dla małych kółek | A Route for Little Wheels | nie / nie |
| start (`module.16.start`) | Mój pomocnik ma małe kółka. Ułóż trasę z przystankiem na ładowanie i miejscem do odpoczynku. | My helper has tiny wheels. Plan a route with a charging stop and a place to rest. | nie / nie |
| hint (`module.16.hint`) | Wszystkie potrzeby są na liście. Poprawny plan może mieć więcej niż jedną wersję. | Every requirement is on the list. There can be more than one correct plan. | nie / nie |
| done (`module.16.done`) | Plan gotowy. Pomocnik zarezerwował już miejsce na drzemkę. | The plan is ready. The helper has already reserved a nap spot. | nie / nie |

## module.17 — Akumulator lubi przerwy

- Rodzina: Planowanie; mechanika: `distance_resource`.
- Role miejsc: `roads_with_charging_anchor`.
- Potrzebne wejścia: `provided_core`, `distance_costs`.
- Wynik dla kolejnego etapu: `charged_core`.
- Reguła ukończenia: Ładunek rdzenia maleje wyłącznie wraz z dystansem pokonanym przez awatara. Postój nic nie kosztuje; istnieje odzyskiwanie ładunku.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.17.title`) | Akumulator lubi przerwy | A Battery That Likes Breaks | nie / nie |
| start (`module.17.start`) | Rdzeń traci ładunek podczas drogi. Zaplanuj, czy potrzebujemy przystanku ładowania. | The core loses charge while travelling. Work out whether we need a charging stop. | nie / nie |
| hint (`module.17.hint`) | Postój nie zużywa energii. Porównaj zapas z kosztem pozostałej drogi. | Stopping uses no energy. Compare the charge with the cost of the remaining route. | nie / nie |
| done (`module.17.done`) | Dotarliśmy z zapasem. Akumulator wolałby jeszcze jedną przerwę, ale da radę. | We arrived with charge to spare. The battery would prefer another break, but it will manage. | nie / nie |

## module.18 — Jedna fiolka, kilka pomysłów

- Rodzina: Narzędzia i zasoby; mechanika: `exclusive_tool_choice`.
- Role miejsc: `waterfront`, `green`, `workshop_npc`.
- Potrzebne wejścia: `provided_empty_flask`, `valid_essences`.
- Wynik dla kolejnego etapu: `essence`.
- Reguła ukończenia: Wybierz jedną z dostarczonych wirtualnych esencji. Każda pokazana opcja ma przygotowaną drogę do zakończenia.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.18.title`) | Jedna fiolka, kilka pomysłów | One Flask, Several Ideas | nie / nie |
| start (`module.18.start`) | Fiolka mieści tylko jedną esencję. Każda pomoże, lecz w inny sposób. | The flask holds only one essence. Each will help, but in a different way. | nie / nie |
| hint (`module.18.hint`) | Sprawdź opis działania przed wyborem. Nie ma tu ukrytej złej odpowiedzi. | Read each effect before choosing. There is no hidden wrong answer. | nie / nie |
| done (`module.18.done`) | Esencja wybrana. Teraz dobierzmy do niej sensowny przepis. | Essence selected. Now let us choose a suitable recipe. | nie / nie |

## module.19 — Manometr ma swoje zdanie

- Rodzina: Narzędzia i zasoby; mechanika: `instrument_diagnosis`.
- Role miejsc: `workshop`, `waterfront`, `square`, `npc`.
- Potrzebne wejścia: `reference_reading`, `instrument_readings`.
- Wynik dla kolejnego etapu: `calibrated_reading`.
- Reguła ukończenia: Dopasuj odczyty do podanego wzorca, wskaż wadliwy miernik i poprawny wynik. Wartości są fikcyjne.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.19.title`) | Manometr ma swoje zdanie | A Gauge With an Opinion | nie / nie |
| start (`module.19.start`) | Dwa czujniki pokazują różne liczby. Na karcie mamy poprawny odczyt wzorcowy. | Two sensors show different numbers. The card gives us the correct reference reading. | nie / nie |
| hint (`module.19.hint`) | Porównaj odczyty z wzorcem. Głośniejszy czujnik nie musi mieć racji. | Compare the readings with the reference. The louder sensor is not necessarily right. | nie / nie |
| done (`module.19.done`) | Odczyt poprawiony. Czujnik nadal wygląda na obrażony. | Reading corrected. The sensor still looks offended. | nie / nie |

## module.20 — Przepis bez szczypty przypadku

- Rodzina: Narzędzia i zasoby; mechanika: `recipe_selection`.
- Role miejsc: `workshop`, `shop`, `npc`.
- Potrzebne wejścia: `essence`, `provided_recipe_materials`.
- Wynik dla kolejnego etapu: `crafted_tool`.
- Reguła ukończenia: Dopasuj esencję do przepisu. Każda oferowana esencja pozwala przygotować działające narzędzie.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.20.title`) | Przepis bez szczypty przypadku | A Recipe Without Guesswork | nie / nie |
| start (`module.20.start`) | Z tej esencji zrobimy narzędzie. Dobierz przepis według tabeli, nie koloru mojego fartucha. | We can turn this essence into a tool. Choose the recipe from the table, not from the colour of my apron. | nie / nie |
| hint (`module.20.hint`) | Znajdź w tabeli swoją esencję i odpowiadający jej składnik. | Find your essence in the table and its matching ingredient. | nie / nie |
| done (`module.20.done`) | Narzędzie gotowe. Wreszcie coś, co mieści się w instrukcji. | Tool ready. Finally, something that fits the instructions. | nie / nie |

## module.21 — Naprawa z przerwą na myślenie

- Rodzina: Narzędzia i zasoby; mechanika: `repair_after_puzzle`.
- Role miejsc: `workshop`, `shop`, `station`, `npc`.
- Potrzebne wejścia: `fault_description`, `repair_solution`.
- Wynik dla kolejnego etapu: `working_device`.
- Reguła ukończenia: Rozwiąż zagadkę konkretnej usterki, potem wykonaj naprawę. Minimalny adapter używa zagadki i naprawy; interaktywne zawory to osobny zakres.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.21.title`) | Naprawa z przerwą na myślenie | A Repair With Time to Think | nie / nie |
| start (`module.21.start`) | Zanim dokręcimy wszystko naraz, sprawdźmy, co naprawdę się zepsuło. | Before tightening everything at once, let us find out what actually broke. | nie / nie |
| hint (`module.21.hint`) | Użyj wskazówki z diagnozy. Dopiero potem rozpocznij naprawę. | Use the diagnostic clue. Then start the repair. | nie / nie |
| done (`module.21.done`) | Działa! Tym razem nawet zgodnie z przeznaczeniem. | It works! This time, even as intended. | nie / nie |

## module.22 — Komu trochę pary?

- Rodzina: Narzędzia i zasoby; mechanika: `energy_allocation`.
- Role miejsc: `two_devices_near_npc`.
- Potrzebne wejścia: `provided_battery`, `two_services`.
- Wynik dla kolejnego etapu: `powered_site`.
- Reguła ukończenia: Wybierz jedną z dwóch osobistych usług. Oba wyniki mają wartość; efekt trzeba wyjaśnić i zapisać wybór raz.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.22.title`) | Komu trochę pary? | Who Needs a Little Power? | nie / nie |
| start (`module.22.start`) | Jeden akumulator, dwa urządzenia. Wybierz, które uruchomimy teraz. | One battery, two devices. Choose which one we start now. | nie / nie |
| hint (`module.22.hint`) | Warsztat i obserwatorium pomagają inaczej. Oba wybory są poprawne. | The workshop and observatory help in different ways. Both choices are valid. | nie / nie |
| done (`module.22.done`) | Wybrane urządzenie ruszyło. Drugie wpiszemy na następną naprawę. | The chosen device is running. We will schedule the other for another repair. | nie / nie |

## module.23 — Mocniej czy dokładniej?

- Rodzina: Narzędzia i zasoby; mechanika: `tool_mode_choice`.
- Role miejsc: `viewpoint`, `square`, `workshop_npc`.
- Potrzebne wejścia: `provided_artifact`, `mode_effects`.
- Wynik dla kolejnego etapu: `artifact_mode`.
- Reguła ukończenia: Wybierz moc albo precyzję. Oba tryby mają wykonalny finał; nie wymaga się rzeczywistej wysokości terenu.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.23.title`) | Mocniej czy dokładniej? | More Power or More Precision? | nie / nie |
| start (`module.23.start`) | Regulator ma dwa ustawienia: większą moc albo dokładniejszy odczyt. | The regulator has two settings: more power or a more precise reading. | nie / nie |
| hint (`module.23.hint`) | Wybierz według potrzeb finału. Efekty obu ustawień widzisz na karcie. | Choose according to the final task. Both effects are shown on the card. | nie / nie |
| done (`module.23.done`) | Ustawienie zapisane. Tym pokrętłem nie będziemy już kręcić bez powodu. | Setting saved. We will stop turning that dial just for the sake of it. | nie / nie |

## module.24 — Dwa miejsca w pudełku

- Rodzina: Narzędzia i zasoby; mechanika: `two_slot_selection`.
- Role miejsc: `green`, `market`, `workshop`.
- Potrzebne wejścia: `specimen_options`, `pair_requirements`.
- Wynik dla kolejnego etapu: `specimen_set`.
- Reguła ukończenia: Zachowaj lub wymień dwa wirtualne okazy tak, żeby spełnić podany warunek pary. Potrzebne opcje muszą być dostępne.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.24.title`) | Dwa miejsca w pudełku | Two Spaces in the Box | nie / nie |
| start (`module.24.start`) | Pudełko mieści dwie próbki. Wybierz parę pasującą do zamówienia. | The box holds two samples. Choose a pair that matches the request. | nie / nie |
| hint (`module.24.hint`) | Możesz wymieniać próbki. Warunek pary jest zapisany obok pudełka. | You can swap samples. The pair requirement is written beside the box. | nie / nie |
| done (`module.24.done`) | Para skompletowana. Pudełko zamyka się bez siadania na wieczku. | The pair is complete. The box closes without anyone sitting on the lid. | nie / nie |

## module.25 — Nie każdy ryk to groźba

- Rodzina: Spotkania; mechanika: `behaviour_interpretation`.
- Role miejsc: `park`, `square`, `outskirts`.
- Potrzebne wejścia: `creature_signals`, `provided_safe_options`.
- Wynik dla kolejnego etapu: `ally_or_passage`.
- Reguła ukończenia: Z podanych sygnałów rozpoznaj preferencję fikcyjnego stworzenia. Pokojowa reakcja otwiera przejście lub relację.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.25.title`) | Nie każdy ryk to groźba | Not Every Roar Is a Threat | nie / nie |
| start (`module.25.start`) | Stworzenie reaguje na dźwięki i zapachy. Najpierw zobacz, co je uspokaja. | The creature reacts to sounds and smells. First, see what calms it. | nie / nie |
| hint (`module.25.hint`) | Przyjrzyj się wszystkim pokazanym reakcjom. Nie wybieraj na podstawie samych zębów. | Study every shown reaction. Do not decide just by looking at the teeth. | nie / nie |
| done (`module.25.done`) | Uspokoiło się. Chyba po prostu potrzebowało trochę zrozumienia. | It has calmed down. Perhaps it just needed a little understanding. | nie / nie |

## module.26 — Wabik na dobrym miejscu

- Rodzina: Spotkania; mechanika: `bait_position`.
- Role miejsc: `two_reachable_scene_points`.
- Potrzebne wejścia: `guard_pattern`, `provided_lure`.
- Wynik dla kolejnego etapu: `guard_displaced`.
- Reguła ukończenia: Umieść wirtualny wabik w jednym z dwóch punktów według znanego zasięgu sygnału. Wynik natychmiastowy, bez czekania czasu rzeczywistego.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.26.title`) | Wabik na dobrym miejscu | A Well-Placed Lure | nie / nie |
| start (`module.26.start`) | Strażnik słyszy tylko określony rytm. Ustaw wabik tam, gdzie odciągnie go od przejścia. | The guardian hears only a certain rhythm. Place the lure where it will draw it away from the passage. | nie / nie |
| hint (`module.26.hint`) | Sprawdź zasięg zaznaczony na mapie i drogę strażnika. | Check the range marked on the map and the guardian path. | nie / nie |
| done (`module.26.done`) | Przejście wolne. Wabik ma teraz bardzo uważnego słuchacza. | The passage is clear. The lure now has a very attentive listener. | nie / nie |

## module.27 — Pojedynek o spokojną pracę

- Rodzina: Spotkania; mechanika: `conditional_encounter`.
- Role miejsc: `reachable_arena`.
- Potrzebne wejścia: `encounter_rules`, `provided_defence`.
- Wynik dla kolejnego etapu: `encounter_result`.
- Reguła ukończenia: Wygraj przez ochronę NPC lub przerwanie sygnału, zamiast samych obrażeń. Nie udostępniaj bez obsługi takiego warunku w silniku.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.27.title`) | Pojedynek o spokojną pracę | A Duel for Some Peace and Quiet | nie / nie |
| start (`module.27.start`) | W tym pojedynku liczy się osłona pomocnika, a nie liczba uderzeń. | In this duel, protecting the helper matters more than the number of hits. | nie / nie |
| hint (`module.27.hint`) | Warunek zwycięstwa jest pokazany przed rozpoczęciem. | The victory condition is shown before you start. | nie / nie |
| done (`module.27.done`) | Pomocnik bezpieczny. Można wreszcie skończyć pracę. | The helper is safe. We can finally finish the job. | nie / nie |

## module.28 — Strażnik i instrukcja

- Rodzina: Spotkania; mechanika: `knowledge_based_guardian`.
- Role miejsc: `workshop`, `square`, `outskirts`.
- Potrzebne wejścia: `crafted_tool`, `guardian_rule`.
- Wynik dla kolejnego etapu: `guardian_resolved`.
- Reguła ukończenia: Dopasuj efekt narzędzia do ujawnionej słabości fikcyjnego strażnika. Możliwe wyłączenie lub pokojowe przejście.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.28.title`) | Strażnik i instrukcja | The Guardian and Its Instructions | nie / nie |
| start (`module.28.start`) | Osłona strażnika reaguje według jednej zasady. Mamy narzędzie, które ją wykorzysta. | The guardian shield follows one rule. We have a tool that can use it. | nie / nie |
| hint (`module.28.hint`) | Porównaj działanie narzędzia z opisem osłony. | Compare the tool effect with the shield description. | nie / nie |
| done (`module.28.done`) | Strażnik przepuszcza nas dalej. Instrukcja okazała się przydatna. | The guardian lets us pass. The instructions turned out to be useful. | nie / nie |

## module.29 — Towarzysz z pytaniami

- Rodzina: Spotkania; mechanika: `companion_stops`.
- Role miejsc: `short_connected_route`.
- Potrzebne wejścia: `companion_preferences`, `route_plan`.
- Wynik dla kolejnego etapu: `companion_trust`.
- Reguła ukończenia: Wybieraj odpowiedzi przy stałych przystankach towarzysza. Pomocnik czeka; bez próby nadążania. Zaufanie zmienia się według reguł.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.29.title`) | Towarzysz z pytaniami | A Companion With Questions | nie / nie |
| start (`module.29.start`) | Pójdę z tobą. Tylko uprzedzam: mam kilka pytań o tę okolicę. | I will come along. Fair warning: I have a few questions about this neighbourhood. | nie / nie |
| hint (`module.29.hint`) | Towarzysz poczeka. Możesz spokojnie obejrzeć wskazówki przed odpowiedzią. | Your companion will wait. Take your time with the clues before answering. | nie / nie |
| done (`module.29.done`) | Dziękuję za wyjaśnienia. Następną drogę spróbuję zaplanować samodzielnie. | Thank you for explaining. I will try planning the next route myself. | nie / nie |

## module.30 — Sąsiedzi i jeden zawór

- Rodzina: Spotkania; mechanika: `evidence_mediation`.
- Role miejsc: `two_npcs_near_square`.
- Potrzebne wejścia: `dispute_evidence`, `two_positions`.
- Wynik dla kolejnego etapu: `settlement`.
- Reguła ukończenia: Uzgodnij rozwiązanie usuwające dowiedzioną przyczynę i uwzględniające potrzeby obu stron. Zła diagnoza daje korektę, nie losowe zaufanie.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.30.title`) | Sąsiedzi i jeden zawór | Two Neighbours and One Valve | nie / nie |
| start (`module.30.start`) | Każdy twierdzi, że to drugi narobił hałasu. Sprawdźmy urządzenie, zanim zaczniemy się spierać. | Each says the other made the noise. Let us inspect the device before arguing. | nie / nie |
| hint (`module.30.hint`) | Ugoda ma rozwiązać przyczynę problemu i uwzględnić potrzeby obojga. | The agreement must address the cause and both neighbours' needs. | nie / nie |
| done (`module.30.done`) | Mamy wspólny plan. Zawór nie musi już słuchać kłótni. | We have a shared plan. The valve no longer has to listen to the argument. | nie / nie |

## module.31 — Klucz tylko jeden

- Rodzina: Spotkania; mechanika: `priority_and_alternative`.
- Role miejsc: `two_nearby_devices`.
- Potrzebne wejścia: `provided_tool`, `two_faults`, `alternative_method`.
- Wynik dla kolejnego etapu: `priority_result`.
- Reguła ukończenia: Ograniczone narzędzie wykorzystaj przy wybranej usterce; drugą usuń jawnie dostarczoną metodą alternatywną. Bez porażki na czas.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.31.title`) | Klucz tylko jeden | Only One Spanner | nie / nie |
| start (`module.31.start`) | Jednym kluczem naprawimy jedno urządzenie. Przy drugim trzeba będzie wymyślić inne rozwiązanie. | One spanner will repair one device. We need a different solution for the other. | nie / nie |
| hint (`module.31.hint`) | Obejrzyj obie usterki. Jedna ma rozwiązanie bez klucza. | Inspect both faults. One has a solution that needs no spanner. | nie / nie |
| done (`module.31.done`) | Oba problemy rozwiązane. Klucz dostał więcej pochwał, niż zasłużył. | Both problems are solved. The spanner received more praise than it deserved. | nie / nie |

## module.32 — Targ bez sakiewki

- Rodzina: Spotkania; mechanika: `bounded_trade_chain`.
- Role miejsc: `shop`, `market_npc`.
- Potrzebne wejścia: `provided_trade_item`, `known_trade_table`.
- Wynik dla kolejnego etapu: `trade_item`.
- Reguła ukończenia: Wybierz maksymalnie trzy jawne wirtualne wymiany lub opisany skrót osobisty. Bez zakupów i ukrytej pętli wymian.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.32.title`) | Targ bez sakiewki | A Market Without a Purse | nie / nie |
| start (`module.32.start`) | Nie potrzebuję złota. Potrzebuję części, której szuka mój sąsiad. Sprawdź tablicę wymian. | I do not need gold. I need the part my neighbour wants. Check the trade board. | nie / nie |
| hint (`module.32.hint`) | Wszystkie oferty widzisz od początku. Ułóż najkrótszy pasujący łańcuch. | Every offer is visible from the start. Find the shortest matching chain. | nie / nie |
| done (`module.32.done`) | Wymiana zakończona. Każdy dostał coś, czego naprawdę potrzebował. | Trade complete. Everyone received something they actually needed. | nie / nie |

## module.33 — Ogródek z charakterem

- Rodzina: Konsekwencje; mechanika: `garden_choice`.
- Role miejsc: `park`, `green_square`.
- Potrzebne wejścia: `specimen_set`, `garden_options`.
- Wynik dla kolejnego etapu: `garden_state`.
- Reguła ukończenia: Wybierz wirtualny układ nasadzeń i zachowaj osobisty efekt wizualny. Bez codziennych logowań, zegara i rzeczywistego sadzenia.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.33.title`) | Ogródek z charakterem | A Garden With Character | nie / nie |
| start (`module.33.start`) | Mamy sadzonki. Wybierz, czy ogródek ma pachnieć, świecić czy przyciągać małe stworzenia. | We have the seedlings. Choose whether the garden should smell lovely, glow or attract little creatures. | nie / nie |
| hint (`module.33.hint`) | Każdy wariant zostaje w twojej okolicy. Nie musisz codziennie wracać. | Each version stays in your own world. You do not have to return every day. | nie / nie |
| done (`module.33.done`) | Ogródek gotowy. Ta część okolicy będzie teraz przypominać twój wybór. | Garden ready. This corner of the neighbourhood will remember your choice. | nie / nie |

## module.34 — Mozaika po drzemce

- Rodzina: Konsekwencje; mechanika: `mosaic_reconstruction`.
- Role miejsc: `square`, `landmark`, `workshop`.
- Potrzebne wejścia: `provided_fragments`, `pattern_clue`.
- Wynik dla kolejnego etapu: `restored_landmark`.
- Reguła ukończenia: Odtwórz trzy fragmenty dekoracji gry z podanej wskazówki. Tylko osobista nakładka, bez sugerowania rzeczywistej renowacji zabytku.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.34.title`) | Mozaika po drzemce | A Mosaic After a Long Nap | nie / nie |
| start (`module.34.start`) | Trzy płytki odpadły z naszej dekoracji. Wzór na ramie pokaże, jak je ułożyć. | Three tiles fell from our decoration. The pattern on the frame shows how to arrange them. | nie / nie |
| hint (`module.34.hint`) | Zacznij od znaku, który łączy się z ramą. Reszta musi pasować do sąsiadów. | Start with the symbol that joins the frame. The rest must match their neighbours. | nie / nie |
| done (`module.34.done`) | Mozaika znowu jest cała. Zostaje tu jako ślad twojej pracy. | The mosaic is whole again. It stays here as a reminder of your work. | nie / nie |

## module.35 — Kronika bez pomieszanych stron

- Rodzina: Konsekwencje; mechanika: `story_reconstruction`.
- Role miejsc: `library`, `temple`, `office`, `chronicler_npc`.
- Potrzebne wejścia: `three_story_cards`, `chronology_clue`.
- Wynik dla kolejnego etapu: `story_fact`.
- Reguła ukończenia: Ułóż trzy fikcyjne karty lore według jawnej wskazówki chronologicznej. Bez wymyślania historii prawdziwego miejsca.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.35.title`) | Kronika bez pomieszanych stron | A Chronicle With Its Pages in Order | nie / nie |
| start (`module.35.start`) | Ktoś pomieszał trzy strony kroniki Paktu. Daty i ślady pomogą przywrócić kolejność. | Someone mixed up three pages of the Pact chronicle. The dates and clues will help restore their order. | nie / nie |
| hint (`module.35.hint`) | Najpierw współpraca, później rozstanie, potem nowe przebudzenie. | First came cooperation, then separation, then the new awakening. | nie / nie |
| done (`module.35.done`) | Teraz historia ma sens. Wiemy też trochę więcej o dawnych urządzeniach. | Now the story makes sense. We also know a little more about the old devices. | nie / nie |

## module.36 — Miejsce przy warsztacie

- Rodzina: Konsekwencje; mechanika: `resident_service_choice`.
- Role miejsc: `workshop`, `square`, `npc`.
- Potrzebne wejścia: `resident_candidates`, `known_service_effects`.
- Wynik dla kolejnego etapu: `resident_service`.
- Reguła ukończenia: Wybierz jedną osobistą usługę spośród trzech mieszkańców. Zapisz efekt, zachowaj przyszły dostęp do alternatyw; bez globalnej eksmisji.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.36.title`) | Miejsce przy warsztacie | A Place by the Workshop | nie / nie |
| start (`module.36.start`) | Mamy wolne stanowisko. Kogo zaprosisz: mechanika, kartografa czy opiekuna stworzeń? | We have an empty workspace. Who will you invite: a mechanic, a cartographer or a creature keeper? | nie / nie |
| hint (`module.36.hint`) | Każda osoba oferuje inną usługę. Opisy są na kartach. | Each person offers a different service. Read their cards. | nie / nie |
| done (`module.36.done`) | Nowe stanowisko zajęte. W warsztacie będzie trochę więcej życia. | The new workspace is occupied. The workshop will feel a little livelier. | nie / nie |

## module.37 — Latarnie zaczynają rozmawiać

- Rodzina: Konsekwencje; mechanika: `personal_network`.
- Role miejsc: `connected_lantern_nodes`.
- Potrzebne wejścia: `working_nodes`, `connection_plan`.
- Wynik dla kolejnego etapu: `beacon_network`.
- Reguła ukończenia: Połącz dwa lub trzy działające fikcyjne urządzenia. Odkrywaj dozwolone lokalne sygnały, nie całą niepoznaną mapę.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.37.title`) | Latarnie zaczynają rozmawiać | The Lanterns Start Talking | nie / nie |
| start (`module.37.start`) | Urządzenia działają osobno. Połączmy je, żeby przekazywały sobie krótkie sygnały. | The devices work separately. Let us connect them so they can share short signals. | nie / nie |
| hint (`module.37.hint`) | Połącz oznaczone węzły według planu. Nie każda latarnia musi wejść do sieci. | Connect the marked nodes according to the plan. Not every lantern needs to join the network. | nie / nie |
| done (`module.37.done`) | Sieć działa. W okolicy pojawią się nowe, krótkie wskazówki. | The network is working. New short clues will appear nearby. | nie / nie |

## module.38 — Warsztat wielu rąk

- Rodzina: Konsekwencje; mechanika: `community_contribution`.
- Role miejsc: `regional_project_npc`.
- Potrzebne wejścia: `provided_contribution`, `community_counter`.
- Wynik dla kolejnego etapu: `community_contribution`.
- Reguła ukończenia: Wnieś ograniczony wkład raz. Potrzebny wspólny stan serwera i ochrona przed powtórzeniem; nie było to włączone w paczce początkowej.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.38.title`) | Warsztat wielu rąk | Many Hands, One Workshop | nie / nie |
| start (`module.38.start`) | Wspólnie składamy miejską dekorację. Twój fragment też ma swoje miejsce. | We are building a town decoration together. Your piece has a place in it too. | nie / nie |
| hint (`module.38.hint`) | Wkład liczymy raz. Cały projekt nie wymaga codziennego wracania. | Each contribution counts once. The project does not require daily visits. | nie / nie |
| done (`module.38.done`) | Twój fragment zapisany. Teraz dołączą do niego prace innych graczy. | Your piece is recorded. Other players' work will join it. | nie / nie |

## module.39 — Dzisiaj pokazuje inaczej

- Rodzina: Dedukcja; mechanika: `historical_reading_comparison`.
- Role miejsc: `previous_anchor`.
- Potrzebne wejścia: `previous_reading`, `new_reading`, `change_evidence`.
- Wynik dla kolejnego etapu: `change_explanation`.
- Reguła ukończenia: Porównaj zapisany wcześniejszy fikcyjny pomiar z nowym. Wymagaj rzeczywistej historii zapisu; bez narzuconej daty lub harmonogramu powrotów.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.39.title`) | Dzisiaj pokazuje inaczej | A Different Reading Today | nie / nie |
| start (`module.39.start`) | Zachowaliśmy poprzedni odczyt. Porównaj go z nowym i sprawdź, co się zmieniło. | We kept the previous reading. Compare it with the new one and find what changed. | nie / nie |
| hint (`module.39.hint`) | Sama różnica liczb to jeszcze nie wyjaśnienie. Potrzebujemy śladu przyczyny. | Different numbers are not an explanation by themselves. We need evidence of the cause. | nie / nie |
| done (`module.39.done`) | Zmiana wyjaśniona. Stara notatka okazała się całkiem przydatna. | Change explained. The old note proved quite useful. | nie / nie |

## module.40 — Ten znak już znam

- Rodzina: Konsekwencje; mechanika: `history_callback`.
- Role miejsc: `current_route_npc`, `square`.
- Potrzebne wejścia: `completed_related_quest`, `known_symbol`.
- Wynik dla kolejnego etapu: `callback_resolution`.
- Reguła ukończenia: Rozpoznaj wcześniej zdobyty znak. Oferuj tylko przy istniejącym zapisie historii; bez dopisywania fałszywych wspomnień.
- Status w danych: `content_design_requires_runtime_adapter`.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title (`module.40.title`) | Ten znak już znam | I Have Seen That Symbol | nie / nie |
| start (`module.40.start`) | Spójrz na tę pieczęć. Pojawiła się też w naszej wcześniejszej przygodzie. | Look at that seal. It appeared in our earlier adventure too. | nie / nie |
| hint (`module.40.hint`) | Sprawdź zapisane odkrycie w dzienniku. Nie musisz zgadywać z pamięci. | Check the discovery in your journal. You do not have to guess from memory. | nie / nie |
| done (`module.40.done`) | Dawna wskazówka otworzyła nowy trop. Dobrze, że jej nie wyrzuciliśmy. | An old clue opened a new lead. Good thing we kept it. | nie / nie |
