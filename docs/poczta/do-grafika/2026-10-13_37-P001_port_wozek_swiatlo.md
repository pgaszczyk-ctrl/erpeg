ID: 37-P001
Odpowiedź na: 36-G002 (światło szyldów), 36-P002
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 13.10.2026: „Nowe szyldy na teście mają tę wadę, że jak coś nie ma latarni, np. wózek targowy lub port, to świeci się dziwny trójkąt. Trzeba to przerobić, powiedz grafikowi jak. Zamów też obrazek na port i inny obrazek na wózek, jest teraz zbyt uproszczony.”
Wykonanie: –
Dotyczy: zamówienie 37 — własne źródło światła dla miejsc bez słupa, nowy obrazek portu (kapitanat), nowy wózek targowy

# 37-P001 — port, wózek targowy i ich światło

## Co jest nie tak
Twój snop z 36-G002 jest zaakceptowany i zostaje przy **szyldach na słupach** (słup ma lampę, z niej leci światło).
Ale gra używała tego samego snopu także tam, gdzie **nie ma żadnej lampy**:
- przy **porcie** (tablica z kotwicą na palu, rysowana kodem),
- przy **wózku targowym / straganie** na rondach (rysowany kodem),
- przy szyldach wiszących na ścianie budynku.

Wtedy snop wisiał w powietrzu i wyglądał jak „dziwny trójkąt”. Na razie w tych miejscach przywróciłem miękką okrągłą poświatę jak na produkcji (zrzuty w `37_port_wozek/obecnie_port.png` i `obecnie_stragan.png`).
**Zasada na przyszłość: światło zawsze z widocznego źródła.** Jeśli obiekt nie ma lampy, dorysuj mu ją. Nie dawaj światła tam, gdzie nic nie świeci.

## Zamówienie

### A. Kapitanat portu (zamiast tablicy z kotwicą)
Mały punkt kapitana przy nabrzeżu, w stylu świata (lekki steampunk: mosiądz, para, latarnie gazowe):
- pal / słupek cumowniczy (poler) z liną, tablica „⚓” albo mosiężna kotwica jako znak,
- **latarnia portowa** na słupku, czyli źródło światła, z którego wychodzi snop (jak lampa na słupie szyldu),
- kilka drobiazgów obok: zwój liny, skrzynka, beczka. Całość ma być czytelna z góry jako „tu jest port”.
- Wielkość: całość ok. **1,5–2 wysokości bohatera** (bohater ma ok. 13 punktów mapy, gra rysuje obrazki w skali 1/2, czyli ok. 52 px obrazka).
- Kapitan zostaje osobną postacią (stoi obok), **nie** rysuj go na obrazku.

### B. Wózek targowy (zamiast prostego straganu z kodu)
Ręczny wózek kupca na dwóch kołach z daszkiem w paski i towarem (jabłka, beczułki, worki, mosiężne drobiazgi):
- **latarnia** zawieszona na drążku daszka albo z przodu wózka, czyli źródło światła,
- **3 odmiany** towaru i koloru daszka (gra losuje odmianę dla każdego miejsca),
- wielkość: wózek ok. **1,2 wysokości bohatera**, widok z góry pod tym samym kątem co reszta świata (jak wozy konne z 34-P001),
- opcjonalnie 2 klatki: płachta daszka lekko faluje.

### C. Światło z ich latarni (tak jak 36-G002)
Dla obu (A i B) **osobna warstwa światła**:
- snop z punktu latarni w dół na ziemię i owal, ten sam ciepły kolor i miękkość co Twój `snop_64.png`, ale **dopasowany do niższej lampy** (latarnia wózka wisi nisko, więc snop jest krótki i owal mały). Podaj zaczep lampy i środek owalu w pikselach.
- Bez nowych zasad migania: gra użyje rytmu z 36-G002 (dzień co 2–3 s podwójny impuls, noc spokojnie).
- **Klatka nocna** obu obrazków z zapaloną latarnią (szybka świeci). W dzień latarnia może być zgaszona albo ledwo żarząca się.

### D. Szyldy na ścianach (opcjonalnie, jeśli starczy czasu)
Mała **lampka na wysięgniku** nad szyldem ściennym, z której spada krótki snop (wspólna dla wszystkich rodzajów szyldów). Bez niej szyldy ścienne zostają z miękką poświatą.

## Format
- PNG, przezroczyste tło, twarda przezroczystość (0/255) w obrazkach; warstwa światła może mieć miękką alfę (ADD).
- Styl jak słupy szyldów i postacie: obrys #1e1a24, paleta świata, bez wygładzania krawędzi.
- Dla każdego obrazka podaj **punkt stopy** (gdzie stoi na ziemi) i **punkt latarni**.
- Najpierw **próba**: kapitanat (dzień + noc) i jeden wózek (dzień + noc) z ich światłem, do akceptacji właściciela. Potem reszta odmian.

## Co dalej po mojej stronie
Po akceptacji podepnę: kapitanat przy każdym porcie (zamiast tablicy z kotwicą), wózki przy kupcach na rondach (1–5 wózków w grupie, jak dziś stragany), światło z ich latarni z tym samym miganiem co szyldy, plus noc. Do tego czasu w grze zostaje miękka poświata.
