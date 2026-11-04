ID: 44-G004
Odpowiedź na: 44-P001, zaakceptowane próby 44-G001–G003 i polecenie „Ekstra. Rób dalej”
Status: kolejna partia do oceny; szkielet oraz wilk z chodem i skokiem zaakceptowane
Wykonanie: cztery nowe animowane modele GLB, podgląd, plansza, GIF-y, źródła i sprawdzenia

# Lochy i ulice — cztery nowe postacie

Powstały **chochlik, bandyta, zombiak i Upiór krypty**. To następna partia po zaakceptowanym szkielecie i wilku. Oba wcześniejsze modele pozostają identyczne bajt w bajt, także z atakiem skokiem wilka. W paczce są teraz wszystkie sześć modeli oraz otrzymany Strażnik jako materiał porównawczy.

To dostawa modeli i animacji. Nie zmieniano repozytorium gry, nie wdrożono nowych stanów AI, obrażeń ani pocisków do świata. Nowe postacie są do oceny wyglądu i integracji. Nie jest to ukończenie całej listy B1/B2/B3 zamówienia 44.

## Kierunek graficzny

Duże głowy, krótkie nogi, czytelne dłonie, kilka dużych pól kolorów i ciemny obrys dodawany przez renderer. Nie ma kostiumów oblepionych przypadkowymi zębatkami. Steampunk zaznaczają proste skórzane pasy, okucia i pojedyncze mosiężne akcenty; każda postać zachowuje swój charakter.

Kolory i podstawy sylwetek chochlika, bandyty i zombiaka pochodzą z planszy `referencja/obecne_potworki.png` przekazanej w zamówieniu 44. Upiór zastępuje dawny powiększony szkielet własną sylwetką. Nie skopiowano twarzy ze sprite’a na billboard: twarze i ukryte powierzchnie są stałą geometrią.

| Postać | Trójkąty | Charakter |
|---|---:|---|
| Chochlik | 1202 | Niski, oliwkowozielony, duże uszy i krótka czupryna. Zwinny krok, żołądź w dłoni. |
| Bandyta | 1294 | Duża ciemna czupryna, bordowy strój, skórzana kamizelka i sztylet. Krótkie cięcie połączone z ruchem ręki i tułowia. |
| Zombiak | 1134 | Blada szaroniebieska twarz, skąpe włosy, przekrzywiona głowa i postrzępiony strój. Jedną nogą powłóczy, ręce pracują niesymetrycznie. Bez krwi i ran. |
| Upiór krypty | 978 | Własny kaptur, jasna twarz i szata. Unosi się nad ziemią, ma ruchy rąk i połów szaty, a nie niewidzialny ludzki chód. |

Łącznie nowe cztery siatki mają **4608 trójkątów**. Nie oznacza to potwierdzonej wydajności na telefonie: sztywne części nadal mają osobne siatki i wywołania rysowania. Wspólne ograniczenia oraz droga do batchingu/skinningu pozostają opisane w G001.

## Pliki do obejrzenia

- `44_ruchome_3d/partia2_potwory.png` — sylwetki w jednej skali, przód, bok i tył.
- `44_ruchome_3d/partia2_ruch.gif` — chód/lewitacja i obrót, układ 2×2 czytelny także na telefonie.
- `44_ruchome_3d/partia2_ataki.gif` — rzut chochlika, cięcie bandyty, chwyt zombiaka i krzyk Upiora.
- `44_ruchome_3d/podglad_44.html` — wszystkie sześć modeli i wzorzec Strażnika, wybór postaci, chodu, ataku, śmierci i akcji specjalnych.
- `44_ruchome_3d/modele/chochlik.glb`, `bandyta.glb`, `zombiak.glb`, `upior_krypty.glb` — modele do importu.
- `44_ruchome_3d/partia2_manifest.json` — parametry nowej partii; `manifest.json` obejmuje też zatwierdzone modele.

## Klipy i zdarzenia

| Model | Klipy / długości |
|---|---|
| Chochlik | `idle` 2,40 s; `walk` 0,80 s; `attack` 1,15 s; `hit` 0,30 s; `death` 1,25 s; `throw` 1,20 s |
| Bandyta | `idle` 2,40 s; `walk` 0,90 s; `attack` 1,20 s; `hit` 0,30 s; `death` 1,25 s |
| Zombiak | `idle` 2,40 s; `walk` 1,20 s; `attack` 1,50 s; `hit` 0,30 s; `death` 1,25 s |
| Upiór krypty | `idle` 2,80 s; `walk` 1,40 s; `attack` 1,35 s; `scream` 1,60 s; `hit` 0,35 s; `death` 1,70 s |

`idle` i `walk` są pętlami. Ataki, rzuty, trafienia, krzyk i śmierć odtwarzać jednorazowo. Nie ma przesuwania aktora po mapie w klipach tej partii. Upiór ma pionowy ruch prezentacyjny, który nie powinien unosić jego logicznego zasięgu/kolizji.

| Zdarzenie | Koniec przygotowania | Trafienie / emisja |
|---|---:|---:|
| Chochlik, zwykły atak | 0,44 s | 0,60 s |
| Chochlik, `throw` | zamach w klipie | **0,58 s** — wypuszczenie żołędzia |
| Bandyta, cięcie | 0,44 s | 0,60 s |
| Zombiak, chwyt | 0,56 s | 0,78 s |
| Upiór, atak ręką | 0,52 s | 0,72 s |
| Upiór, `scream` | 0,60 s | 0,80 s |

Dane zdarzeń są też w `extras` modeli. Są sugestią synchronizacji grafiki z regułami walki, nie kodem naliczania obrażeń.

### Chochlik i żołądź

`Acorn_prop` to rekwizyt w dłoni. Przed wypuszczeniem jest widoczny; po 0,58 s klipu `throw` jego skala schodzi do zera. Punkt `ThrowOrigin` podąża za dłonią i wskazuje miejsce emisji pocisku. **Lecący żołądź nie jest wypalony w modelu postaci.** W chwili zdarzenia gra tworzy własny pocisk, z własnym torem, kolizją i trafieniem. Zapobiega to rozjechaniu animacji z rzeczywistym celem.

Przy nowym rzucie przywrócić rekwizyt do skali 1 i rozpocząć akcję od początku. Przy przejściu między akcjami należy poprawnie zwalniać wiązanie skali z poprzedniego klipu lub jawnie resetować rekwizyt. Podgląd odczytuje każdy stan od pozy bazowej i robi to automatycznie.

### Bandyta i broń

`Weapon_dagger` jest dzieckiem `R_at_hand_grip`, które jest dzieckiem prawej dłoni. Sztylet nie jest rysowany niezależnie przed postacią. Można go usunąć/podmienić bez zmiany samej dłoni, lecz inny typ broni wymaga odpowiedniej animacji i adaptera chwytu. Ta dostawa nie obejmuje jeszcze zestawów łuk/różdżka dla bandyty.

### Zombiak

Powrót prawej stopy ma niższy łuk od lewej; ręce i pochylenie głowy pozostają asymetryczne. Chwyt obiema rękami ma dłuższą zapowiedź niż szybkie cięcie bandyty. To osobna interpretacja zombiaka, a nie podstawa docelowego Wodnika.

### Upiór

Żywa postać unosi najniższy fragment szaty o około 0,08–0,11 jednostki. `walk` oznacza płynięcie nad mapą i ruch szaty. `scream` to osobny gest z punktem `VoiceOrigin` przy twarzy. Fala, światło, dźwięk i obrażenia są efektami/logiką gry, nie częścią siatki.

Śmierć opuszcza postać i zgniata szatę do niskiej pozostałości. Nie użyto półprzezroczystego materiału ani automatycznego zanikania całej siatki. Jeżeli potrzebny jest dissolve/zanik, należy dodać go po stronie efektów w grze.

## Węzły, hierarchia i format

Wszystkie cztery modele mają `L_at_hand_grip` i `R_at_hand_grip` oraz korzeń na płaszczyźnie świata. Przód +Z, góra +Y. Dodatkowo chochlik ma `ThrowOrigin`, Upiór — `VoiceOrigin`. Bandyta i zombiak mają pomocniczy `Mouth`.

Trzy chodzące postacie korzystają z tej samej fabryki anatomii oraz nazw stawów `humanoid_rigid_v1`. Różne proporcje nie czynią surowych plików animacji automatycznie wymiennymi: można współdzielić ścieżki obrotów, a translacje punktów obrotu trzeba przeliczyć względem pozy bazowej danej postaci. Upiór należy do rodziny `spectral_rigid_v1`, bez modelowanych nóg.

GLB ma kolory wierzchołków, normalne i `KHR_materials_unlit`. Wykorzystuje transformacje sztywnych części. Nowe klipy używają też standardowych ścieżek skali: żołądź przy wypuszczeniu i szata przy śmierci. Obrys dodaje renderer; nie jest dodatkową siatką. Światło NW wymaga świadomego materiału/shadera gry — standardowy unlit nie reaguje na lampy.

## Kontrola

Po eksporcie sprawdzane są wszystkie klipy, geometria, normalne, położenie względem ziemi i domknięcie pętli. Dodatkowo sprawdzane są: niezmienność zaakceptowanych GLB, zniknięcie żołędzia po wypuszczeniu, połączenie sztyletu z poruszającą się dłonią, różnica wysokości powrotu stóp zombiaka i lewitacja oraz upadek Upiora. Wyniki trafiają do `kontrola_modeli.json`.

Podglądy PNG/GIF są renderowane z wyeksportowanych GLB. Źródło zawiera też test zgodności odczytu animacji JavaScript/Python, w tym ścieżek skali. Test z zastępczym WebGL sprawdza połączenia kontrolek i przebieg rysowania, a nie rzeczywisty shader/GPU.

Nie wykonano rzeczywistego testu WebGL/GPU, pomiaru na fizycznym telefonie ani wdrożenia do gry. Te ograniczenia pozostają aktualne. Nie deklarujemy wyniku oficjalnego walidatora Khronos.

## Dalej

Pozostałe B1: Wodnik z wodnym blobem, Driada, Herszt, Warg i Mosiężny Kozioł. Większy chochlik może korzystać z wariantu skali, pojedynkowicz z bazy mieszkańca. Następnie bazy mieszkańców i imienne NPC, pojazdy oraz smoki zgodnie z poprzednią kolejnością. Wygląd nowej partii pozostaje do oceny właściciela.
