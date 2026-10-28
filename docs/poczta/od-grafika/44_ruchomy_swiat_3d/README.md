# EXP-LORE — ruchomy świat 3D, wersja 44-G008

Bieżąca poprawka: **chibi proporcje i postawa według aktualnego Strażnika 16**. Poprawiono 15 mieszkańców i siedem humanoidów, w tym zombie. Zaakceptowane Szkielet i Wilk pozostają bez zmian.

Zacznij od **44_ruchome_3d/G008_porownanie_chibi.png**, **G008_chibi_ruch.gif** i **referencja/STYL_CHIBI.md**. Bieżąca instrukcja: **od-grafika/2026-10-27_44-G008_powrot_do_chibi.md**. Przed KAŻDĄ nową partią obowiązuje powrót do wzorca (`AGENTS.md`). Poniższe opisy G007 są historyczne; wymóg zachowania dawnych brył humanoidów został zastąpiony zleconą korektą G008.

Najnowsza partia: **15 wyglądów mieszkańców z sześciu rodzin sylwetek oraz pies**. Podglądy: **44_ruchome_3d/partia4_ruch.gif**, **partia4_gesty.gif**, **partia4_mieszkancy.png**, **partia4_profile.png**. Ludzie chodzą, rozmawiają, machają dłonią i noszą parasol; pies chodzi, siada i merda ogonem.

Instrukcja: **od-grafika/2026-10-27_44-G007_mieszkancy_i_pies.md**. Palety i warianty: **44_ruchome_3d/mieszkancy_warianty.json**. Modele do oceny, przed wdrożeniem do gry. Nazwani NPC i Mechaniczny Gladiator pozostają do wykonania.

Poprzednia partia: **Wodnik, wodny blob, Driada, Herszt, Warg i Mosiężny Kozioł**. Obejrzyj **44_ruchome_3d/partia3_ruch.gif**, **partia3_ataki.gif** i **partia3_potwory.png**.

Pełna paczka ma **12 modeli przeciwników, 15 wyglądów mieszkańców i psa** oraz otrzymanego Strażnika jako wzorzec. Dotychczasowe 12 modeli zachowano bez zmian, w tym pełniejsze bryły z G005. Nowe modele są do oceny oraz integracji, bez wdrożenia do gry.

**44_ruchome_3d/podglad_44.html** działa samodzielnie offline z WebGL. Grupy modeli są układane w siatkę; można wybrać jedną postać i każdy jej klip. Nowe GLB: **44_ruchome_3d/modele/**.

Odpowiedź poprzedniej partii: **od-grafika/2026-10-27_44-G006_wodnik_driada_herszt_warg_koziol.md**. Zawiera klipy, czasy trafień, punkty emisji oraz zasady zużywania ruchu skoku i szarży. Poprzednie odpowiedzi zachowano dla wcześniejszych modeli i historii ustaleń.

Nie wykonano rzeczywistego testu GPU ani fizycznego telefonu. PNG/GIF powstają z rzeczywistych GLB. Wyniki: **44_ruchome_3d/kontrola_modeli.json**.

Odbudowa: Python 3 + numpy/scipy/Pillow, `python rebuild.py`; GIF-y: `python rebuild.py --gifs`. Sprawdzenia JavaScript wymagają Node.js.

Zachowana korekta G005: **od-grafika/2026-10-27_44-G005_pelniejsze_bryly.md** oraz **44_ruchome_3d/partia2_profil_porownanie.png**.
