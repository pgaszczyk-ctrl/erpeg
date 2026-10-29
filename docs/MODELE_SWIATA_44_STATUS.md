# Ruchomy świat 3D — stan 29.10.2026

## Gotowe i zaakceptowane: G008

28 modeli GLB / 152 klipy: 12 przeciwników, 15 wyglądów mieszkańców, pies. Modele w `public/modele/swiat44/`, źródła i instrukcje w `docs/poczta/od-grafika/44_ruchomy_swiat_3d/`. Podgląd na teście: `/test/modele-swiata.html`. Osobny plik `public/modele/wzorzec-chibi.glb` służy wyłącznie porównaniu z aktualnym Strażnikiem.

PR #35 podłącza 12 modeli przeciwników (14 typów gry) przez wspólny renderer `src/stwory3d.ts`, domyślnie na TEST. Sprawdzone GLB/animacje i walka PC/telefon emulowany; raport `docs/TEST_STWORY3D_20261028.md`. 15 wyglądów przechodniów, mądrale i zaakceptowany pies chibi G010 są podłączone na TEST we wspólnym atlasie z przeciwnikami. `src/ludzik3d.ts` nadal obsługuje bohatera. Paczka G008 ma podłączone wszystkie 28 modeli (pies zastąpiony zaakceptowanym G010). Szczegóły: `docs/TEST_MIESZKANCY3D_20261029.md`.

## Podłączone na TEST

- 12 modeli przeciwników / 14 typów gry; 15 wyglądów mieszkańców dobieranych deterministycznie do płci i wieku istniejącej postaci; mądrale korzystają z tych samych baz; pies G010 na Guliwera/Cyda.
- Chód i spoczynek, rozmowa przy zatrzymanej symulacji, deszcz z parasolem trzymanym w ręce. Pies chodzi, siada przy postoju i merda podczas rozmowy. Oryginalne zadania, nagrody, kolizje i pozycje są zachowane.
- Jeden kontekst WebGL i atlas 32 miejsc wspólny z przeciwnikami; pierwszeństwo przeciwników, culling i powrót do sprite’a dla nadmiaru / błędu ładowania / utraty kontekstu. `?mieszkancy3d=0` wyłącza tylko mieszkańców, `?stwory3d=0` tylko przeciwników.
- Pojedynek nadal korzysta z dotychczasowego wojownika 2D (modele mieszkańców nie zawierają attack/hit/death). Przechodzień znika na czas pojedynku i wraca później. Gazeciarz zachowuje własny wygląd.
- Do pomiaru pozostaje fizyczny telefon; test automatyczny telefonu jest emulacją przeglądarki.

## Do przygotowania / akceptacji grafiki

- Nazwani NPC: Albrecht, Margo, Marek, Iwonka, Grażynka, Luigi, Martin, Woźnica (także konduktor i kapitan portu), Gazeciarz, Sędzia Areny i Mechaniczny Gladiator. Sześć pierwszych powstało w osobnej partii G009 do oceny; ta dostawa G008 ich nie zawiera. Nie oznaczać ich jako zaakceptowane ani wdrożone.
- Animacje walki dla mieszkańców wyzywanych na pojedynek: obecne modele mają idle/walk/talk/wave/rain, bez zestawu attack/hit/death. Nie zastępować tego bez sprawdzenia animacjami dorosłego innego modelu.
- Sześć smoków: leśny, kwasowy, trujący, ognisty, górski i Cień smoka. Wspólna baza, odmiany głów/kolców/palet, idle/walk/bite/breathe/takeoff/fly/land/death i punkt emisji Snout.

Przed każdą partią wrócić do aktualnego chibi Strażnika i `referencja/STYL_CHIBI.md`: duża głowa, krótki zwarty korpus, krótkie grube kończyny i stabilny rozstaw. Zatwierdzone Szkielet i Wilk pozostają wzorcami swojej grupy.

Nagrobki, wejścia i wnętrza lochów (część A zamówienia 44) są osobnym zakresem ilustracji. Pojazdy i pozostałe placeholdery z części C wymagają osobnego ustalenia kolejności; nie są częścią tej paczki modeli.
