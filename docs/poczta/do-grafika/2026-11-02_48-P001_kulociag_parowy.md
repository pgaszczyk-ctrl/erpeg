ID: 48-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: odpowiedziano (48-G001, 48-P002)
Akceptacja: czeka na właściciela
Wykonanie: –
Dotyczy: Kulociąg Parowy – podziemny pinball w miastach z metrem (kolumna z logo, właz, podziemna hala, wyrzutnie, kula, rury)

# Zamówienie 48: Kulociąg Parowy

W miastach z prawdziwym metrem (Warszawa, Praga, Paryż…) zamiast armat jeździ się podziemnym pinballem. Kolejność
scen i czekanie na wczytanie celu są już w kodzie, ale rysunki z kodu właściciel odrzucił („bez klimatu steampunk,
jakby dziecko rysowało”). **Wzór stylu: Arena Cechu** (`48_pinball/wzor_styl_arena_tyl.png`, czyli Twoja płyta,
trybuny i kratki z zamówienia 38): ta sama gęstość rysunku, ciepłe mosiądze, cegła, para, obrys #1e1a24, paleta
świata. Zrzuty `48_pinball/teraz_*.png` pokazują tylko obecny układ scen, nie styl.

## 1. Logo „Kulociąg Parowy” (EN „Steam Ballway”)
Emaliowany szyld w mosiężnej ramie, motyw kuli w rurze albo zębatki. Dwie wielkości: pozioma ok. 240×60 px i mała do
kolumny ok. 48×20 px w pikselach świata. Osobno napis PL i osobno EN.

## 2. Kolumna przy włazie (na ulicy)
Ma być widoczna z daleka. Mosiężna kolumna ok. 1,8 wysokości postaci, żeliwna stopa, na górze szklana kula ze
światłem, logo z p. 1, rura wychodząca z ziemi przy włazie, gwizdek z boku. Dwie klatki: spokój i bucha para.
Podstawa = środek dołu rysunku.

## 3. Właz
Żeliwna pokrywa w mosiężnym pierścieniu, widziana z góry pod kątem budynków. Pokrywa i otwór osobno, bo program
przesuwa pokrywę. Rozmiar ok. 20×12 px świata.

## 4. Podziemna hala stacji (odjazdy i przyjazdy)
Jedna i ta sama hala służy do odjazdu i do przyjazdu (przy przyjeździe gra wpisuje nazwę stacji docelowej).
- **Styl jak arena**, może być od niej większa. To podziemna sala: sklepienie z cegły, mosiądz, rury, para.
- **Oświetlenie**: steampunkowe światełka (lampy gazowe, żarówki w mosiężnych klatkach). Jasno i klimatycznie,
  wyraźnie jaśniej niż w lochu. **Jedna lampa mruga**, więc potrzebne są jej 2–3 klatki (świeci, przygasa, gaśnie).
- **Wejście schodami** z ulicy, ze światłem dnia z góry.
- **Przejście kawałek w bok** od schodów, do części z wyrzutniami. Bohater schodzi, idzie tym przejściem i wsiada.
- **Kilka wyrzutni w rzędzie, nie tylko „nasza”.** Pozostałe żyją same: co jakiś czas wystrzeliwują kulę albo
  przyjmują kulę przyjezdną. Potrzebne klatki kuli wpadającej z góry do wyrzutni i jej hamowania parą.
- **Nazwa stacji**: wolna emaliowana tablica na ścianie (ok. 440×70 px) i wolna rama mozaiki w posadzce
  (ok. 520×180 px). W te miejsca program sam wpisze nazwę i ułoży mozaikę w barwach flagi kraju, bo każda stacja ma
  inną nazwę. Nazwa musi zostać czytelna, więc wystarczą puste ramy jako osobne warstwy.
- Format: tło 1280×720 (albo 640×360 do powiększenia ×2) bez napisów, a lampy, wyrzutnie, tablica i rama mozaiki
  jako osobne warstwy z podanym miejscem.

## 5. Wyrzutnia (na niej program animuje start)
Maszyna w hali: szklana rura w górę, sprężyna z tłokiem, manometr, zawory, kotłownia.
**Przebieg startu**: sprężyna jest ściskana przez **siłowniki parowe** (widać, jak tłoki siłowników pracują
i dociskają), przy ściskaniu **bucha para** z zaworów i spod tłoków, wskazówka manometru idzie w czerwone pole,
**potem wystrzał**: sprężyna puszcza i kula leci w górę rury.
Klatki:
- 4 klatki ściskania (luz → pełne) z siłownikami w kolejnych położeniach;
- 1 klatka „puszcza”;
- osobno wskazówka manometru (program ją obraca);
- 3–4 kłęby pary z zaworów i siłowników.

To napięcie trwa, dopóki gra wczytuje stację docelową, dlatego pełne ściśnięcie musi wyglądać dobrze także wtedy,
gdy chwilę „trzyma” (lekkie drżenie, para).

## 6. Kula
Szklana kula z mosiężną obręczą (program wkłada w nią postać), 64×64 px, 4 klatki obrotu odblasku.

## 7. Rury między stacjami
Tło ceglanego tunelu, które da się powtarzać w pionie (np. 640×256 px), do tego odcinek mosiężnej rury i 2 odbijacze
jak we flipperze (zgaszony i świecący).

## Kolejność
Najpierw próba: logo (p. 1) i kolumna (p. 2) na ulicy. Potem szkic hali (p. 4) do akceptacji właściciela, dopiero
później wyrzutnie i reszta. Rysujemy w pikselach świata (PALETA_SWIATA, obrys 1 px #1e1a24, bez wygładzania), tło
przezroczyste.
