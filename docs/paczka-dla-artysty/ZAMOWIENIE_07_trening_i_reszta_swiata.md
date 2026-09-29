# Zamówienie 07 – kukły treningowe i wszystko, co jeszcze rysuje program

Wozy konne wyszły **świetnie** – dokładnie tak ma wyglądać cała gra. Są już na każdej stacji, w 3 ładunkach i 3 maściach. Dzięki!

## Jak pracujemy (tak jak przy wozach – to zadziałało)

1. Najpierw **podgląd** do akceptacji. Pliki produkcyjne robisz **z zaakceptowanego obrazka**: wycinasz, dajesz przezroczyste tło, nic nie rysujesz od nowa i nie dorysowujesz programem.
2. **Styl jak wozy i ludziki:** miękkie, ładne cieniowanie, światło z lewej-góry, cienki ciemny kontur jak na podglądzie wozu, przygaszone barwy (mosiądz matowy, drewno ciepłe), lekki steampunk (mosiężne okucia, nity, trybiki) jako ozdoba, nie na siłę.
3. **Rozmiar pliku dowolny, byle duży i równy** (np. klatka 400–1000 px wysokości, wszystkie klatki jednego obiektu tej samej wielkości). Zmniejszamy sami. W opisie niżej podaję **wielkość w grze w porównaniu z ludzikiem** – to jest ważne, a nie piksele.
4. Widok jak u ludzików i wozów: **z przodu, lekko z góry**, obiekt stoi na dolnej krawędzi obrazka, środek podstawy na środku.
5. Przed wysłaniem połóż obiekt obok ludzika i wozu w tej samej skali – mają wyglądać jak z jednej gry.

Zestawienie wszystkiego, co dziś rysuje program (do zastąpienia): `5_zrzuty_z_gry/do_przerysowania_grafiki_z_programu.png`.

## A. Trening na boiskach – ✅ ZROBIONE (paczka „07 trening przyrządy final”, już w grze – dzięki!)

Na dużych boiskach stoją trzy przyrządy do ćwiczeń (miecz, łuk, magia), a na drugim końcu boiska druga kukła do zadania trenera. Bohater uderza w nie mieczem albo strzela – przy każdym trafieniu przyrząd się **kiwa**. Każdy przyrząd: **3 klatki obok siebie** – (1) stoi spokojnie, (2) trafiony: odchylony ok. 10–15° do tyłu, (3) wraca, lekko przechylony w drugą stronę.

### `kukla_treningowa` – do ćwiczeń mieczem

- **Wysokość w grze: jak dorosły mieszkaniec** (głowa kukły na wysokości głowy ludzika).
- Gruby drewniany **słup wbity w ziemię**, u dołu mały kopczyk ziemi i kępka trawy (albo krzyżak z desek).
- **Tułów:** worek z juty wypchany słomą, ściśnięty w pasie sznurkiem; spod sznurka i szwów wystają źdźbła słomy.
- **Ramiona:** poziomy drewniany drąg przełożony przez tułów, na końcach owinięty szmatą i sznurkiem.
- **Na piersi:** stary, połatany skórzany napierśnik z **mosiężnymi nitami** i jedną mosiężną płytką (lekki steampunk), porysowany od cięć.
- **Głowa:** mniejszy worek ze słomą, zawiązany u szyi; **twarz** – dwa krzyżyki z grubej nici zamiast oczu i zszyty uśmiech (sympatycznie, nie strasznie – grają dzieci).
- Kolory: jasne, ciepłe drewno i juta, przygaszony brąz skóry, matowy mosiądz.
- Klatka 2 (trafiony): odchylona do tyłu, **kilka źdźbeł słomy odlatuje**.

### `kukla_treningowa_druga` – druga kukła (zadanie trenera)

- Ta sama kukła, ale z **czerwoną wstążką** zawiązaną na ramieniu drąga i **czerwoną chorągiewką** wbitą obok w ziemię – żeby było widać z daleka, że to ta, do której trzeba dobiec. 3 klatki jak wyżej.

### `tarcza_strzelnicza` – do ćwiczeń z łuku

- **Wysokość w grze: ok. 0,9 ludzika.**
- Okrągła **mata ze sprasowanej słomy** (widać zwinięte pasy słomy), na niej **namalowane koła**: przygaszona czerwień, kremowa biel, środek czerwony; farba trochę spękana.
- Stoi na **drewnianym stojaku-trójnogu** (litera A z podpórką z tyłu), mata przywiązana sznurkiem, w rogach **mosiężne klamry**.
- Klatka 1: czysta tarcza; klatka 2: **w tarczy tkwi strzała** (drzewce + lotki), tarcza drgnęła; klatka 3: strzała tkwi, tarcza się uspokaja.

### `krysztal_magii` – do ćwiczeń magii

- **Wysokość w grze: jak ludzik.**
- **Mosiężny postument** na kamiennej podstawie: kolumienka z **trybikami i rurkami**, u góry trzy mosiężne szpony.
- Szpony trzymają **unoszący się niebieski kryształ** (ostre ściany, jaśniejszy środek), wokół delikatna niebieska poświata.
- Klatka 1: spokojny, lekko świeci; klatka 2: trafiony – **jasny błysk**, drobne iskierki i małe łuki błyskawic między szponami; klatka 3: blask gaśnie, kryształ lekko obrócony.

### Postacie do boisk – NIE RYSOWAĆ

Trener i biegaczka zostali na razie usunięci z gry (nie pasowali do klimatu). Nie rysuj ich.

## B. Pozostałe rzeczy, które dziś rysuje program (w tej kolejności)

1. ✅ **ZROBIONE – szyldy są w grze** (wycięte z Twojej planszy 12 szyldów). ~~**Znaczki miejsc nad drzwiami** (dziś małe kolorowe kwadraty):~~ szyldy w nowym stylu – drewniana tabliczka w mosiężnej ramce, na łańcuszkach, z jednym prostym symbolem. Wielkość w grze: **ok. 1/3 ludzika**, wszystkie tej samej wielkości: sklep (koszyk/waga), szkoła (książka i pióro), kościół (krzyż), urząd (pieczęć), szpital (czerwony krzyż), policja (odznaka), biblioteka (stos książek), hotel (łóżko), bank (moneta), alchemik (kolba), sklep budowlano-sportowy (młotek i namiot), kemping (namiot). Plik: `szyld_<nazwa>`.
2. **Stragan kupca** na rondach (`stragan_kupca`): wózek z pasiastym daszkiem i skrzynkami towaru, w stylu wozów (może z tym samym koniem), 2 klatki (koń stoi / przestępuje).
3. **Rzeczy do podniesienia** (leżą na ziemi, **ok. 1/4 ludzika**): moneta, serduszko, jabłko, śliwka, kiść winogron, marchewka, brokuł, sałata, zguba z zadania (skórzana sakiewka). Każda 1 klatka.
4. **Smok** (najważniejsza postać historii!): arkusz jak u wrogów (3 × 3, dół/bok/góra), **ok. 2,5 ludzika wysokości**; łuskowaty, szlachetny, trochę baśniowy (nie potwór z horroru), zielono-mosiężny, z oczami, w których może się tlić Rdza Umysłu (bursztynowy blask). Do tego **cień smoka widziany z góry** (`cien_smoka`), 2 klatki: skrzydła w górze / w dole – sama sylwetka, półprzezroczysta czerń.
5. **Pies** (`pies`, arkusz 3 × 3 jak ludziki, ok. 0,5 ludzika) i **świnka** (`swinka`, mała, 1–2 klatki) z zadania psa.
6. **Dom bohatera** – mały znaczek na dachu (`znak_domu`): mosiężna tabliczka z domkiem albo chorągiewka.
7. **Ekran (HUD)**, na końcu: serduszka (pełne, puste, niebieskie – premia, fioletowe – pojedynek), gwiazdki doświadczenia (pełna, połówka, pusta), ikona mapy, dymek rozmowy, dymek „?”, wykrzyknik „!”, znaczniki misji (żółty z „!”, zielony – wykonane), strzałka celu. Te mogą zostać prostsze i bardzo czytelne – ale w tej samej kresce.
8. **Efekty walki:** łuk cięcia mieczem (biały półksiężyc), strzała w locie, pocisk magii (niebieska kula z iskrami).
9. **Szczyt góry** – chorągiewka na kopczyku kamieni (`szczyt`).

## Kolejność

1. **B2–B3** (stragan kupca, rzeczy do podniesienia). 2. **B4 smok i cień**. 3. reszta.

Zamówienie 06 nadal obowiązuje (poprawione kroki postaci, latarnia, okap dachu, mędrczyni, zaległości).
