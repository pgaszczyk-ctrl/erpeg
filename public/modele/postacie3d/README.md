# Sześć modeli — poprawka głów i obrotu (27.10.2026)

16: strażnik, 01: strażniczka, 12: łucznik, 18: łuczniczka, 11: mag, mage_f: magini.

Każdy GLB ma osobną geometrię głowy i stroju, pełne dłonie oraz klipy idle/walk/attack (60 Hz). Grupa `Weapon` zawiera odpowiednią broń i animowane elementy cięciwy. Stara nazwa `Sword_at_hand_grip` nadal jest obsługiwana przez loader. Wszystkie powierzchnie mają stałe kolory; nie następuje zmiana grafiki wraz z kamerą.

Poprawka: głowy nie pobierają kolorów całego sprite'a przez rzutowanie na zakrzywioną bryłę. Oczy są osobnymi, precyzyjnie ograniczonymi powierzchniami dopasowanymi do czaszki; skóra i włosy mają jawne granice oraz duże pasma koloru. Broda, warkocze, kucyk i nakrycia głowy to osobna geometria we wspólnej części head. Brak losowych plamek z przeźroczystych krawędzi sprite'a. Głowa używa w grze materiału Basic, żeby płaskie trójkąty oświetlenia nie tworzyły nowych plam.

Łucznicy płynnie obracają tułów przy wejściu w postawę strzelecką i wracają na końcu. Pętla ataku zaczyna i kończy się tym samym ustawieniem; nie ma natychmiastowego obrotu 90° przy zmianie chodu na atak. Broń i dłonie pozostają połączone.

`src/ludzik3d.ts` dobiera model według istniejącego modularnego stroju i płci: 11 → mag/magini, 12/18 → łucznik/łuczniczka, inne → strażnik/strażniczka. Test konkretnego modelu: `?ludzik3d=1&model3d=18` (id z listy wyżej). Nie zmienia zapisu ani ekwipunku. Sześć gotowych sylwetek nie odtwarza jeszcze dowolnego zestawienia głowy, ciała i kolorów z kreatora. Typ broni w pliku odpowiada sylwetce, nie dowolnej broni z ekwipunku; pełna wymiana broni pozostaje osobnym etapem.

Źródło wyglądu: modułowe sprite'y właściciela z erpeg, commit c98bf4a0b224c1e6245a9007d502c7118078eafb. Strażniczka: włosy/twarz 01, mundur i hełm 16. Magini: włosy/twarz 01, fioletowy strój i modelowany kapelusz. Ukryte powierzchnie to rekonstrukcja. Postacie segmentowe, bez deformacji skóry i ruchomych palców. ~28–45 tys. trójkątów; przed użyciem do tłumów NPC potrzebne lżejsze warianty.
