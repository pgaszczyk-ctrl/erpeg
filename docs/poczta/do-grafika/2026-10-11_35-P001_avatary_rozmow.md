ID: 35-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 11.10.2026: „przy przyjmowaniu questów chciałbym też widzieć z kim rozmawiam … trzeba zrobić podobne avatarki dla wielu wielu npc i po jakieś 10 dla każdego rodzaju sklepu/urzędu/świątyni itp. zleć to grafikowi” – właściciel wróci do tematu rano 12.10, kod okna rozmowy jeszcze niezrobiony
Wykonanie: –
Dotyczy: zamówienie 35 – portrety rozmówców w oknie dialogu

# 35-P001 — portrety w oknie rozmowy

## Pomysł
W oknie rozmowy (zadania, sklepy, urzędy, mieszkańcy) **po lewej portret rozmówcy, po prawej portret naszego bohatera**. Na zrzucie właściciela („Tajemnica stacji”) dziś widać tylko tekst – nie wiadomo, kto mówi.

## Styl i format (jak portrety HUD z paczki 28 – te zaakceptowane, żywe kolory)
- Popiersie (głowa + ramiona) w ramce, patrzy lekko w bok (rozmówca w prawo, bohater w lewo), światło z lewej-góry.
- **96×96 px** (siatka 48×48 ×2, nearest), przezroczyste tło **albo** gotowy medalion – zaproponuj w próbie; kod może dorysować mosiężną ramkę.
- Bez napisów (gra jest PL/EN).
- Każdy portret ma pasować do postaci z gry (te same kolory ubrania/włosów co na arkuszu chodzenia).

## Lista (kolejność = ważność)
1. **Bohaterowie: 25** – po jednym dla `lista25_01…25` (paczka 28 ma już 25 portretów HUD – jeśli pasują do 96×96, wystarczy dociąć; potwierdź).
2. **Postacie stałe**: mag Albrecht, siostra Margo, dziadek Marek, babcia Iwonka, babcia Grażynka, Luigi, Martin, woźnica, gazeciarz (+ gazeciarka), pies, Kozioł (boss).
3. **Ludzie z miejsc – po ~10 różnych na rodzaj** (płeć/wiek mieszane, żeby się nie powtarzały w sąsiednich budynkach):
   sklep (sprzedawcy), szkoła (nauczyciele), świątynia (kapłani/zakonnice/kościelni), urząd (urzędnicy), policja, szpital (lekarze/pielęgniarki), biblioteka (bibliotekarki/uczeni), bank (kasjerzy), alchemik (stacja benzynowa), sklep sportowy/budowlany, hotel (recepcja), kemping, warsztat samochodowy (mechanicy), pączkarnia/McDonald’s (kucharze), uniwersytet (profesorowie).
4. **Mieszkańcy**: po jednym na każdy z 15 wyglądów `mieszkaniec_01…15` (kod dobierze portret do wyglądu przechodnia).
5. **Wrogowie do pojedynków / bossowie** (opcjonalnie): herszt, wielki herszt, smoki – na później.

## Próba najpierw
**3 portrety**: bohater `lista25_19` (niebieskie włosy, gogle), woźnica, jeden sprzedawca sklepu – w obu wariantach tła. Odpowiedź oznacz 35-G001.
