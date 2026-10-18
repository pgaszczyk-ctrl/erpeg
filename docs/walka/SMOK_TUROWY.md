# Smok w walce turowej – propozycja (18.10.2026)

Właściciel: „walka ze smokiem też ma być turowa, przemyślmy jak to zrobić”.
Ten plik to propozycja do decyzji, jeszcze nie kod.

## Stan dziś

- Walka turowa (src/walka/TuryWalki.ts) toczy się na tej samej mapie,
  w ciągłej przestrzeni (zasięgi w W), bez kratek. Bohater ma 3–5 ruchów,
  akcje Cios, Ruch i Specjalne (Mocny, Lecz, Ucieczka). Każdy wróg ma jedną
  akcję, herszt i berserker po dwie.
- Smok z fabuły i smok z dema walczą na żywo (SmokAI: ugryzienie, stożek
  ognia, kule kwasu, trujący obłok, lot z lądowaniem, fazy według życia).
  Dzikie smoki w trybie turowym tylko rozmawiają.

## Pomysł: smok zapowiada, gracz odpowiada

Na żywo każdy specjalny atak smoka ma czerwoną zapowiedź, przed którą trzeba
uskoczyć. W turach robimy z tego sedno walki:

1. Pod koniec swojej tury smok **zapowiada** następny atak: na ziemi
   pojawia się czerwony obszar (stożek, koła, cień), a w panelu krótki opis,
   np. „Smok nabiera powietrza – ogień w czerwonym polu!”.
2. Gracz ma swoją turę: może wyjść z pola, zaatakować albo się osłonić.
3. Na początku następnej tury smoka atak spada na zapowiedziane pole.
   Kto stoi w środku, obrywa; kto wyszedł, jest bezpieczny.

Smok przestaje być workiem życia i robi się zagadką ustawienia: ile ruchów
wydać na cios, a ile na ucieczkę z pola.

## Ataki w turach

| Atak | Zapowiedź | Skutek |
|------|-----------|--------|
| Ugryzienie | brak (tylko z bliska) | od razu, mocny cios; jedyny atak bez zapowiedzi |
| Ogień | stożek przed pyskiem | obrażenia w stożku; ziemia płonie 2 tury (kto stoi, dostaje podpalenie) |
| Kwas | 3 koła: na bohaterze i obok | obrażenia + oparzenie; kałuże zostają 3 tury |
| Trujący obłok | duże koło | zostaje 3 tury; w środku co turę trucizna i −1 ruch |
| Lot | smok znika, na ziemi cień nad bohaterem | w powietrzu nie da się go trafić; w następnej turze ląduje: dużo obrażeń w środku, mniej na brzegu; po lądowaniu jest **ogłuszony 1 turę** (okazja na mocne ciosy) |

Smok ma dwie akcje na turę (jak herszt): ruch + atak albo atak + zapowiedź.
Obszary zostają na ziemi, więc pole walki z czasem się zawęża.

## Fazy smoka z fabuły

Zostają jak dziś: do 66 % życia tylko ugryzienie i ogień, poniżej 66 %
dochodzą kwas i obłok, poniżej 33 % lot. Wybór „walcz / poznaj go”
(tytuły Pogromca / Brat smoków i melodia) się nie zmienia.

## Nowa akcja gracza: Osłona

Specjalne → **Osłona** (1 ruch): obrażenia z zapowiedzianego ataku o połowę
mniejsze. Ratuje gracza, któremu zabrakło ruchów na wyjście z pola. Zwykłym
wrogom też się przyda.

## Grafika

Na start nic nowego: smoki mają już klatki zionięcia, plucia, startu, lotu
i lądowania od grafika. Zapowiedzi rysuje kod (czerwone pola). Później można
zamówić u grafika ładniejsze zapowiedzi, np. dym z nozdrzy przed ogniem.

## Do decyzji właściciela

1. Dzikie smoki: zostają tylko do rozmowy czy dostają też „Walcz”
   (z łupem: łuski, złoto)?
2. Demo (smok na Wawelu): turowy od razu czy dopiero wtedy, gdy walka
   turowa trafi do zwykłej gry? Demo jest pierwszym zetknięciem gracza
   z grą; walka turowa wymaga tam krótkiego samouczka.
3. Czy wygrana ze smokiem leczy do pełna jak inne walki turowe?
