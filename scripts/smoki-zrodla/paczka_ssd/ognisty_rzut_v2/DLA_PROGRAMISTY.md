# Smok ognisty — próbki poprawionego rzutu

Dwie klatki próbne, nie pełna podmiana animacji.

- `smok_ognisty_stoi_bok_1.png`: stanie, kierunek w lewo.
- `smok_ognisty_ziej_bok_2.png`: poza ziania, kierunek w lewo, bez efektu ognia.

Zmiana dotyczy geometrii: widoczna górna powierzchnia grzbietu, niżej wyciągnięta szyja, skrócone perspektywą łapy oraz skrzydła po bliższej i dalszej stronie ciała.

Obie klatki: 220 × 200 px; wspólna paleta 16 kolorów wraz z tłem #FF00FF. Eksport bez wygładzania. `metadata.json` zawiera granice rysunku i punkt odniesienia eksportu [110, 165]. To punkt techniczny; rzeczywisty pivot silnika trzeba sprawdzić w grze.

## Test w grze

Wyświetlić najpierw każdą klatkę statycznie przy postaci i drzewie. Sprawdzić skalę, osadzenie łap i kolejność rysowania drzewa względem smoka. Na przesłanym zrzucie drzewo zasłania środek tułowia.

Pozostałe klatki wcześniejszej paczki mają stary rzut. Mieszanie ich z tymi próbkami spowoduje skok perspektywy. Przed pełną podmianą należy przerysować pozostałe animacje według nowego układu.

Położenie wylotu płomienia należy dopasować do nowego, niższego pyska. Efekt ognia pozostaje osobnym sprite’em.

`podglad_1x.png` pokazuje obie klatki w rozmiarze docelowym; `podglad_x3.png` to powiększenie bez wygładzania. `zrodlo.png` jest rysunkiem źródłowym generatora, nie arkuszem do bezpośredniego importu.
