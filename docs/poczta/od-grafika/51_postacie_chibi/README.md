# EXP-LORE · 51-P001 · Stroje klasowe

Wydanie do edytora wyglądu, Kufra, portretów i dialogów. Zawiera rekrutkę i rekruta oraz stroje wojownika, łucznika, maga i druida dla Straży Miejskiej i postaci niezależnych. Każdy strój ma osobną warstwę dla sylwetki damskiej i męskiej.

## Złożenie postaci

1. Otwórz `kobieta/manifest.json` albo `mezczyzna/manifest.json`.
2. Wybierz identyfikator z pola `stroje`. `rekrut` to domyślny wygląd początkowy. Przykładowe dalsze identyfikatory to `straz_wojownik` i `niezalezny_druid`.
3. Przy składaniu warstw użyj ścieżek `skora` i `stroj` wybranego wariantu w miejsce domyślnych `skora.png` i `stroj.png`. Ścieżki są względne wobec katalogu danego manifestu. Skóra stroju klasowego zawiera twarz, uszy i szyję. Rękawice i buty są już namalowane w stroju.
4. Ułóż pozostałe warstwy według `warstwy_od_spodu`. Użyj punktu `portret` z tego samego manifestu do kadrowania głowy.

Wszystkie warstwy postaci mają 768 × 1152 px, wspólny początek w lewym górnym rogu i przezroczyste tło. Koloruj skórę, usta, brwi i włosy tak jak w wersji rekruta. Strój jest narysowany w gotowych kolorach.

`podglad_stroje_klasowe.png` pokazuje wszystkie pary. W `podglad/stroje/` są pełnowymiarowe złożenia z przezroczystym tłem.

## Fryzury i kształty twarzy w wersji 5

Doszły trzy fryzury dla rekrutki i trzy dla rekruta. Każda nowa fryzura ma jedną szarą warstwę przednią. Identyfikatory i polskie nazwy znajdują się w tym samym miejscu manifestu co wcześniejsze fryzury.

Do wyboru kształtu twarzy służy `warianty_twarzy.ksztalt` w manifeście. Wybierz z tej opcji `skora_rekrut` dla stroju rekruta albo `skora_stroj_klasowy`, gdy strój ma już rękawice i buty. Podmień całą warstwę skóry. Barw ją według dotychczasowej palety. Kolor oczu, usta, brwi i włosy nadal są oddzielnymi warstwami z dotychczasowymi punktami zakotwiczenia.

`podglad_fryzury_i_twarze.png` pokazuje nowe opcje po złożeniu. W każdej płci kształty twarzy pokazano przy tej samej fryzurze i kolorystyce. Bazę można używać przez dotychczasowe pola manifestu. Do udostępnienia przełącznika kształtu twarzy w grze potrzebna jest obsługa nowego pola.

## Fryzury w wersji 6

Rekrutka ma dwa cienkie warkoczyki do ramion oraz długi warkocz, który opada po przeciwnej stronie niż wcześniejszy długi wariant. Obie fryzury wykorzystują warstwę tylną pod uszami i przednią na ubraniu. Rekrut ma spiczasty irokez z krótkimi bokami, zapisany jako jedna warstwa przednia. Wszystkie nowe warstwy mają 768 × 1152 px i są przygotowane do barwienia w edytorze.

`podglad_fryzury_v6.png` pokazuje nowe fryzury na postaciach. Ich identyfikatory są w polu `fryzury` odpowiednich manifestów.
