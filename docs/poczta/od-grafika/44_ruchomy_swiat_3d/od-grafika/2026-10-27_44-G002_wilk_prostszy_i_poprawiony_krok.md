ID: 44-G002
Odpowiedź na: 44-G001 i uwagi właściciela: „Wilk może być prostszy. Szkielet super!” oraz „Nogi wilka dziwnie chodzą, jak ludzkie”.
Status: szkielet zaakceptowany wizualnie; wilk po poprawkach do oceny

# Wilk — uproszczenie i poprawiony chód

Bieżąca wersja paczki zastępuje próbę wilka z 44-G001. Model i animacje szkieletu pozostają identyczne bajt w bajt. Jego wygląd jest zaakceptowany, co nie zastępuje testu wdrożenia do gry.

Wilk ma teraz **1268 trójkątów zamiast 2330**. Usunięto kępki na policzkach i karku, nakładające się płaty grzbietu i piersi, oddzielne palce, jasne „buty” i drobne kły. Pozostały prosta szara sierść, jasny pysk, czytelne oczy oraz proste uszy i łapy.

Wcześniej przednie i tylne nogi korzystały z podobnego wahadła i zginania dwóch odcinków. To dawało wrażenie ludzkiego marszu. Nowa konstrukcja rozdziela anatomię:

- Przód: bark → łokieć cofnięty względem osi kończyny → nadgarstek → łapa.
- Tył: biodro → kolano skierowane do przodu → osobny, uniesiony staw skokowy z tyłu → łapa.
- Łapy poruszają się w czterech fazach; kolejność kontaktu: lewa tylna → lewa przednia → prawa tylna → prawa przednia.
- Przez 68% własnego cyklu łapa opiera się o ziemię. W pozostałej części wykonuje niski łuk powrotny, bez wysokiego podnoszenia kolan.
- Położenie końców łap wyznacza odwrotna kinematyka. Sylwetka ma niewielkie kołysanie tułowia; podparte łapy pozostają płasko.

Cykl nadal trwa 0,95 s. Długość toru podparcia wynosi 0,25 jednostki modelu, co daje prędkość odniesienia około 0,387 jednostki/s. Przy ruchu aktora po mapie należy dopasować tempo odtwarzania lub krok do prędkości gry. Sam GLB jest animacją w miejscu, więc podparta łapa przesuwa się w nim do tyłu, kompensując przyszły ruch całego aktora do przodu. Dopiero z odpowiednią prędkością aktora będzie nieruchoma względem świata.

Dodanie prawdziwych tylnych stawów skokowych zmieniło hierarchię: `quadruped_canid_v2`, 24 węzły. Nowe węzły: `backL_hock`, `backR_hock`. Nie należy doklejać wcześniejszego klipu `walk` z v1 do tej hierarchii. Importować nowy model razem z jego klipami.

Zachowano nazwy klipów `idle`, `walk`, `attack`, `lunge`, `hit`, `death` i czasy zdarzeń ataku. `lunge` nadal jest aliasem ataku bez przesunięcia po mapie. Ta poprawka dotyczy wyglądu i chodu; nie wdraża logiki walki, sterowania ani optymalizacji wielu aktorów.

Najczytelniejszy podgląd: `44_ruchome_3d/wilk_poprawiony_krok.gif` — równocześnie bok i kamera mapy. Zaktualizowano także `podglad_44.html`, planszę porównawczą, GIF z obrotem i GIF ataku. Bieżące parametry i wyniki kontroli: `manifest.json` i `kontrola_modeli.json`.

Sprawdzenia geometrii, póz i parsera są wykonywane ponownie po zmianie. Nadal brak rzeczywistego testu GPU/WebGL i testu w grze na telefonie. Dokument 44-G001 pozostaje opisem pierwotnej próby i planu pozostałych postaci; w sprawach wilka pierwszeństwo ma niniejsza odpowiedź.
