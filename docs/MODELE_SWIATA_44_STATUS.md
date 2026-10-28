# Ruchomy świat 3D — stan 28.10.2026

## Gotowe i zaakceptowane: G008

28 modeli GLB / 152 klipy: 12 przeciwników, 15 wyglądów mieszkańców, pies. Modele w `public/modele/swiat44/`, źródła i instrukcje w `docs/poczta/od-grafika/44_ruchomy_swiat_3d/`. Podgląd na teście: `/test/modele-swiata.html`. Osobny plik `public/modele/wzorzec-chibi.glb` służy wyłącznie porównaniu z aktualnym Strażnikiem.

Publikacja zasobów i podglądu nie podmienia wyglądu przeciwników i NPC w grze. Obecny `src/ludzik3d.ts` obsługuje bohatera. Status integracji paczki G008 pozostaje otwarty.

## Do podłączenia przez programistę

- Mapowanie typów przeciwników i wyglądów mieszkańców na GLB; wielcy przeciwnicy korzystają ze skalowanych baz. Skala, stopa, zwrot, obrys, głębia, widoczność i efekt trafienia muszą odpowiadać dotychczasowej grze.
- Animacje stania, ruchu, rozmowy, deszczu, ataku, trafienia i śmierci, z wydarzeniami walki powiązanymi z zamachem i emisją pocisku/efektu. Jednorazowo zużywać ruch korzenia skoku/szarży, z kolizjami.
- Pies: chód/siad/merdanie; przechodnie: parasole i gesty; kolory strojów według grup palety.
- Wspólne zarządzanie renderowaniem/cache/cullingiem. Nie tworzyć osobnego kontekstu WebGL dla każdego z 10–20 przeciwników. Zmierzyć FPS i pamięć przy grupie postaci oraz w lochu, również na fizycznym telefonie.
- Pełny test gry: poruszanie, walka i jej zapowiedzi, pociski, śmierć/usuwanie, sceny/ponowne wczytanie, deszcz i rozmowy; brak zmiany kolizji i balansu.

## Do przygotowania / akceptacji grafiki

- Nazwani NPC: Albrecht, Margo, Marek, Iwonka, Grażynka, Luigi, Martin, Woźnica (także konduktor i kapitan portu), Gazeciarz, Sędzia Areny i Mechaniczny Gladiator. Sześć pierwszych powstało w osobnej partii G009 do oceny; ta dostawa G008 ich nie zawiera. Nie oznaczać ich jako zaakceptowane ani wdrożone.
- Animacje walki dla mieszkańców wyzywanych na pojedynek: obecne modele mają idle/walk/talk/wave/rain, bez zestawu attack/hit/death. Nie zastępować tego bez sprawdzenia animacjami dorosłego innego modelu.
- Sześć smoków: leśny, kwasowy, trujący, ognisty, górski i Cień smoka. Wspólna baza, odmiany głów/kolców/palet, idle/walk/bite/breathe/takeoff/fly/land/death i punkt emisji Snout.

Przed każdą partią wrócić do aktualnego chibi Strażnika i `referencja/STYL_CHIBI.md`: duża głowa, krótki zwarty korpus, krótkie grube kończyny i stabilny rozstaw. Zatwierdzone Szkielet i Wilk pozostają wzorcami swojej grupy.

Nagrobki, wejścia i wnętrza lochów (część A zamówienia 44) są osobnym zakresem ilustracji. Pojazdy i pozostałe placeholdery z części C wymagają osobnego ustalenia kolejności; nie są częścią tej paczki modeli.
