# „Czarci Wyrok” / „The Devil's Verdict” (owner, 1 Nov 2026): a ten-stage legend story in Lublin, Polish and English.
# Writes docs/historie/czarci-wyrok.json and docs/sql/czarci-wyrok.sql (test server only: tylkoTest).
import json, pathlib

def t(pl, en):
    return {"pl": pl, "en": en}

TRYBUNAL_PLAC = "51.24765, 22.56800"
KRYPTA = "51.25880, 22.57720"
KALINA = "51.25590, 22.58610"
FARA = "51.24891, 22.56926"
WAWOZ = ["51.25383, 22.53599", "51.25453, 22.53659", "51.25486, 22.53690"]
MLYN = "51.25068, 22.53286"
ZAMEK = "Zamek w Lublinie"

AGATA = {"imie": t("Wdowa Agata", "Widow Agata"), "kobieta": True}
PISARZ = {"imie": t("Pisarz Trybunału", "Tribunal Scribe")}
ZIELARKA = {"imie": t("Zielarka Bronisława", "Bronisława the Herbalist"), "kobieta": True}
SEDZIA = {"imie": t("Sędzia Rogaty", "The Horned Judge"), "zjawa": True}
ZLOTOUSTY = {"imie": t("Pan Złotousty", "Master Goldentongue")}

etapy = [
    {   # 1
        "typ": "zagadka", "miejsce": TRYBUNAL_PLAC, "postac": PISARZ,
        "cel": t("Odpowiedz pisarzowi Trybunału", "Answer the Tribunal Scribe"),
        "tekst": t(
            "Chudy pisarz z okularami na czubku nosa macha do ciebie piórem.\n\n„Pani Agata cię przysłała? Dobrze. Zanim cokolwiek zrobimy, musisz znać historię tego stołu. Dawno temu przekupieni sędziowie skrzywdzili tu biedną wdowę. O północy do sali weszli czarci sędziowie i osądzili sprawę uczciwie. Jeden z nich oparł łapę o stół – i ślad został na zawsze.”",
            "A thin scribe with spectacles on the tip of his nose waves his quill at you.\n\n“Mrs Agata sent you? Good. Before we do anything, you must know the story of that table. Long ago, bribed judges wronged a poor widow here. At midnight, devil judges walked into the hall and judged the case fairly. One of them rested his paw on the table – and the mark stayed forever.”"),
        "pytanie": t("„Powiedz mi więc: co zawołała wdowa, gdy usłyszała niesprawiedliwy wyrok?”",
                     "“So tell me: what did the widow cry out when she heard the unjust verdict?”"),
        "odpowiedzi": [t("„Nawet diabły sądziłyby sprawiedliwiej!”", "“Even devils would judge more fairly!”"),
                       t("„Oddajcie mi moją krowę!”", "“Give me back my cow!”"),
                       t("„Idę na skargę do króla!”", "“I’m going to complain to the king!”")],
        "dobra": 0,
        "podpowiedz": t("Wdowa wspomniała tych, którzy potem naprawdę przyszli o północy.",
                        "The widow named the very ones who later really came at midnight."),
        "komunikat": t(
            "„Właśnie tak. I diabły przyszły.\n\nA teraz słuchaj: pieczęć na dokumencie Złotoustego to pieczęć sędziego Przekupnego – tego samego, który sądził wtedy wdowę! Sędzia leży w krypcie na cmentarzu przy Unickiej. Jeśli ktoś wyniósł stamtąd jego sygnet albo księgi, musimy to udowodnić.”",
            "“Exactly. And the devils came.\n\nNow listen: the seal on Goldentongue’s document is the seal of Judge Palmgrease – the very judge who tried the widow back then! He lies in a crypt at the cemetery on Unicka Street. If someone took his signet ring or his books from there, we must prove it.”"),
    },
    {   # 2
        "typ": "loch", "miejsce": KRYPTA,
        "loch": {"rodzaj": "krypta", "nazwa": t("Krypta sędziego Przekupnego", "Judge Palmgrease’s crypt"), "straznik": "upior"},
        "cel": t("Zejdź do krypty sędziego Przekupnego (cmentarz przy Unickiej)", "Go down into Judge Palmgrease’s crypt (Unicka cemetery)"),
        "tekst": t(
            "Pisarz zapisuje coś drobnym maczkiem.\n\n„Do tej krypty nikt nie schodzi od lat. Ale słyszałem, że ktoś niedawno wyważył kratę… Uważaj na siebie i przynieś, co znajdziesz w skrzyni sędziego.”",
            "The scribe writes something in tiny letters.\n\n“No one has gone down into that crypt for years. But I hear someone forced the grate open not long ago… Be careful, and bring whatever you find in the judge’s chest.”"),
        "daje": [t("Księga sędziego Przekupnego", "Judge Palmgrease’s ledger")],
        "komunikat": t(
            "Pod złotem leżała gruba księga oprawiona w skórę. Sędzia zapisywał w niej każdą łapówkę: kto dał, ile i za jaki wyrok. Na ostatniej stronie ktoś niedawno dopisał świeżym atramentem: „Dom przy Grodzkiej – Złotousty”.\n\nSygnetu w krypcie nie ma. Za to na posadzce widać ślady drobnych pazurków… chochliki?",
            "Under the gold lay a thick leather-bound ledger. The judge wrote down every bribe in it: who paid, how much and for which verdict. On the last page someone recently added in fresh ink: “The house on Grodzka – Goldentongue”.\n\nThe signet ring is not in the crypt. But there are tiny claw marks on the floor… imps?"),
    },
    {   # 3
        "typ": "zagadka", "miejsce": KALINA, "postac": ZIELARKA,
        "cel": t("Porozmawiaj z zielarką w Wąwozie Kalina", "Talk to the herbalist in the Kalina gully"),
        "tekst": t(
            "W wąwozie, między lessowymi ścianami, staruszka zbiera zioła do wiklinowego koszyka. Kiedy pokazujesz jej księgę, kiwa głową.\n\n„Czarcia sprawa, dziecko. Diabły przychodzą tam, gdzie ktoś woła o sprawiedliwość, a ludzie jej nie dają. Ale żeby stanęły przed tobą, a nie przeciw tobie, musisz mieć przy sobie ziele, którego się boją.”",
            "In the gully, between walls of loess, an old woman is gathering herbs into a wicker basket. When you show her the ledger, she nods.\n\n“A devilish business, child. Devils come where someone cries for justice and people refuse it. But for them to stand before you and not against you, you must carry a herb they fear.”"),
        "pytanie": t("„Które ziele ludzie od wieków nazywają czarcim postrachem, bo podobno przegania złe moce?”",
                     "“Which herb have people for ages called the devil’s dread, because they say it drives evil powers away?”"),
        "odpowiedzi": [t("dziurawiec", "St John’s wort"), t("pokrzywa", "nettle"), t("mniszek", "dandelion")],
        "dobra": 0,
        "podpowiedz": t("Jego listki pod światło wyglądają, jakby ktoś przekłuł je igłą.",
                        "Held up to the light, its leaves look as if someone pricked them with a needle."),
        "daje": [t("Pęczek dziurawca", "A bunch of St John’s wort")],
        "komunikat": t(
            "„Dziurawiec. Mówią, że diabeł ze złości podziurawił mu listki igłą – stąd ta nazwa. Weź pęczek.\n\nA teraz biegnij na Stare Miasto. Słyszałam, jak chochliki chwaliły się, że niosą komuś srebrny sygnet. Ktoś je posłał, a one lubią się przechwalać na Placu po Farze.”",
            "“St John’s wort. They say the devil pricked its leaves with a needle out of spite – hence the holes. Take a bunch.\n\nNow run to the Old Town. I heard imps boasting that they were carrying a silver signet ring for someone. Someone sent them, and they love to show off on Plac po Farze.”"),
    },
    {   # 4
        "typ": "pokonaj", "miejsce": FARA, "ile": 5, "wrog": "glut",
        "cel": t("Przegoń chochliki – czarcie sługi – z Placu po Farze", "Drive the imps – the devil’s servants – off Plac po Farze"),
        "tekst": t(
            "Na Placu po Farze, wśród zarysów fundamentów dawnej świątyni, coś chichocze i pobrzękuje łańcuszkiem. Chochliki! Podrzucają coś błyszczącego.",
            "On Plac po Farze, among the outlined foundations of an old temple, something giggles and jingles a little chain. Imps! They are tossing something shiny."),
        "daje": [t("Srebrny sygnet sędziego", "The judge’s silver signet ring")],
        "komunikat": t(
            "Ostatni chochlik upuszcza na bruk srebrny sygnet z wygrawerowaną wagą. Sygnet sędziego Przekupnego! Złotousty kazał chochlikom wynieść go z krypty i nim zapieczętował fałszywy dokument.\n\nUciekające chochliki piszczą: „Do młyna! Do młyna, do pana!”",
            "The last imp drops a silver signet ring engraved with scales onto the cobbles. Judge Palmgrease’s ring! Goldentongue had the imps carry it out of the crypt and sealed the false document with it.\n\nThe fleeing imps squeal: “To the mill! To the mill, to the master!”"),
    },
    {   # 5
        "typ": "badanie", "miejsce": WAWOZ[0], "ile": 2,
        "cel": t("Zbadaj ślady w Wąwozie Sękowskiego (2 z 3)", "Examine the tracks in the Sękowski gully (2 of 3)"),
        "tekst": t(
            "Za Ogrodem Saskim zaczyna się głęboki lessowy wąwóz. Chochliki uciekły tędy w stronę starego młyna – może zostawiły jakieś ślady.",
            "Beyond the Saxon Garden a deep loess gully begins. The imps fled this way towards the old mill – maybe they left some tracks."),
        "tropy": [
            {"id": "lapa", "miejsce": WAWOZ[0], "tytul": t("Odcisk w lessie", "A print in the loess"),
             "tekst": t("W miękkiej, żółtej ziemi widać odcisk – o wiele za duży jak na chochlika. Trzy palce i zakrzywiony pazur. Łapa.",
                        "In the soft yellow earth there is a print – far too big for an imp. Three toes and a curved claw. A paw.")},
            {"id": "trawa", "miejsce": WAWOZ[1], "tytul": t("Osmalona trawa", "Scorched grass"),
             "tekst": t("Kępka trawy jest osmalona, jakby ktoś przeszedł tędy z rozżarzonymi stopami. W powietrzu czuć siarkę.",
                        "A tuft of grass is scorched, as if someone walked past on red-hot feet. The air smells of sulphur.")},
            {"id": "guzik", "miejsce": WAWOZ[2], "tytul": t("Zgubiony guzik", "A lost button"),
             "tekst": t("Między korzeniami leży złoty guzik z wytłoczoną literą Z. Złotousty był tu osobiście!",
                        "Among the roots lies a gold button stamped with the letter G. Goldentongue was here himself!")},
        ],
        "komunikat": t(
            "Ślady mówią jasno: wąwozem w dół, prosto do starego młyna przy Alejach Racławickich – tam, gdzie od dawna nic nie miele.",
            "The tracks speak clearly: down the gully, straight to the old mill on Racławickie Avenue – where nothing has been milled for ages."),
    },
    {   # 6
        "typ": "loch", "miejsce": MLYN,
        "loch": {"rodzaj": "podziemia", "nazwa": t("Piwnice starego młyna", "Cellars of the old mill")},
        "cel": t("Zejdź do piwnic starego młyna", "Go down into the old mill’s cellars"),
        "tekst": t(
            "Stary młyn dawno przestał mielić, ale w jego piwnicach coś stuka i skrzypi. Dawniej ludzie mówili, że w każdym młynie mieszka diabeł… Ten najwyraźniej pracuje teraz dla Złotoustego.",
            "The old mill stopped grinding long ago, but something knocks and creaks in its cellars. People used to say a devil lives in every mill… This one seems to work for Goldentongue now."),
        "daje": [t("Czarcie pióro", "The devil’s quill")],
        "komunikat": t(
            "W skrzyni leżało długie, czarne pióro, ciepłe jak węgielek. Tym piórem Złotousty dopisał swoje imię w księdze sędziego. Czarci sędziowie piszą takimi piórami swoje wyroki – i takie pióro zawsze pamięta, czyja ręka nim pisała.\n\nZ daleka dobiega bicie dzwonu. Jedenasta! Do północy została godzina.",
            "In the chest lay a long black quill, warm as an ember. With this quill Goldentongue wrote his name into the judge’s ledger. Devil judges write their verdicts with such quills – and such a quill always remembers whose hand held it.\n\nA bell tolls in the distance. Eleven! One hour left until midnight."),
    },
    {   # 7
        "typ": "idz", "miejsce": ZAMEK, "naCzas": True,
        "cel": t("Zdąż na Zamek przed północą!", "Reach the Castle before midnight!"),
        "tekst": t(
            "Stół z wypaloną łapą stoi dziś w zamkowych salach. Jeśli zdążysz przed północą, czarci sąd wysłucha ciebie, a nie Złotoustego. Biegiem!",
            "The table with the burnt paw mark stands in the castle halls today. If you make it before midnight, the devils’ court will hear you, not Goldentongue. Run!"),
        "komunikat": t(
            "Zdążyłeś! Wybija północ. Żar w odcisku łapy rozbłyskuje, a cienie na zamkowych ścianach wydłużają się i zaczynają szeptać.",
            "You made it! Midnight strikes. The glow in the paw mark flares up, and the shadows on the castle walls stretch and start to whisper."),
    },
    {   # 8
        "typ": "rozmowa", "miejsce": ZAMEK, "postac": SEDZIA,
        "cel": t("Stań przed Sędzią Rogatym", "Stand before the Horned Judge"),
        "tekst": t(
            "Z cienia wychodzi wysoka postać w sędziowskiej todze. Spod biretu wystają dwa zakręcone rogi, a za plecami kołysze się ogon.\n\n„Ktoś wołał o sprawiedliwość” – mówi głosem jak trzask polan w piecu. – „Tak jak wtedy, przed wiekami. Złotousty już tu jest i twierdzi, że dom jest jego. Przedstaw dowody, wędrowcze. Ale uważaj: czarci sąd nie lubi kłamstw ani gadania bez sensu.”",
            "A tall figure in a judge’s robe steps out of the shadow. Two curled horns stick out from under the cap, and a tail sways behind.\n\n“Someone cried out for justice,” it says in a voice like logs crackling in a stove. “Just like back then, centuries ago. Goldentongue is already here and claims the house is his. Present your evidence, traveller. But beware: the devils’ court dislikes lies and empty talk.”"),
    },
    {   # 9
        "typ": "paragraf", "miejsce": ZAMEK, "postac": ZLOTOUSTY,
        "cel": t("Przedstaw dowody na nocnej rozprawie", "Present the evidence at the night trial"),
        "strony": [
            {"tekst": t("Złotousty poprawia złote guziki i uśmiecha się słodko.\n\n„Wysoki Sądzie, dom jest mój. Mam dokument z prawdziwą pieczęcią!”\n\nSędzia Rogaty patrzy na ciebie. Co pokazujesz najpierw?",
                        "Goldentongue straightens his gold buttons and smiles sweetly.\n\n“Your Honour, the house is mine. I have a document with a genuine seal!”\n\nThe Horned Judge looks at you. What do you show first?"),
             "wybory": [{"tekst": t("Pokaż sygnet sędziego Przekupnego", "Show Judge Palmgrease’s signet ring"), "dobry": True},
                        {"tekst": t("Powiedz, że Złotousty ma brzydki uśmiech", "Say Goldentongue has an ugly smile"), "dobry": False},
                        {"tekst": t("Zacznij płakać", "Start crying"), "dobry": False}]},
            {"tekst": t("„Sygnet umarłego sędziego?” – Sędzia Rogaty unosi brew. – „Pieczęć prawdziwa, tylko ręka fałszywa. Ale skąd mam wiedzieć, kto nim pieczętował?”",
                        "“A dead judge’s signet ring?” The Horned Judge raises an eyebrow. “A genuine seal, but a false hand. Yet how am I to know who sealed with it?”"),
             "wybory": [{"tekst": t("Otwórz księgę na ostatniej stronie", "Open the ledger at the last page"), "dobry": True},
                        {"tekst": t("Przysięgnij na swoje buty", "Swear on your boots"), "dobry": False},
                        {"tekst": t("Zaproponuj, żeby spytać chochliki", "Suggest asking the imps"), "dobry": False}]},
            {"tekst": t("W księdze, świeżym atramentem: „Dom przy Grodzkiej – Złotousty”. Złotousty blednie.\n\n„To… to każdy mógł dopisać!” – woła. – „Nie ma dowodu, że to moja ręka!”",
                        "In the ledger, in fresh ink: “The house on Grodzka – Goldentongue”. Goldentongue turns pale.\n\n“Anyone… anyone could have written that!” he shouts. “There is no proof it was my hand!”"),
             "wybory": [{"tekst": t("Połóż na stole czarcie pióro", "Lay the devil’s quill on the table"), "dobry": True},
                        {"tekst": t("Wzrusz ramionami", "Shrug"), "dobry": False},
                        {"tekst": t("Krzyknij głośniej od niego", "Shout louder than him"), "dobry": False}]},
            {"tekst": t("Pióro samo podrywa się ze stołu, kreśli w powietrzu ognisty podpis – taki sam jak w księdze – i wskazuje stalówką prosto na Złotoustego. W sali robi się cicho jak w krypcie. Pęczek dziurawca w twojej kieszeni pachnie mocno: czarci sędziowie trzymają się od ciebie z daleka i patrzą tylko na oszusta.\n\n„Dowody są jasne” – mówi Sędzia Rogaty. – „A ponieważ to ty je zebrałeś, wędrowcze, ty powiesz, jaki ma być wyrok.”",
                        "The quill leaps from the table by itself, draws a fiery signature in the air – the same as in the ledger – and points its nib straight at Goldentongue. The hall falls as silent as a crypt. The St John’s wort in your pocket smells strong: the devil judges keep away from you and look only at the cheat.\n\n“The evidence is clear,” says the Horned Judge. “And since you gathered it, traveller, you shall say what the verdict is.”")},
        ],
    },
    {   # 10
        "typ": "decyzja", "miejsce": ZAMEK, "postac": SEDZIA, "wyborKlucz": "wyrok",
        "cel": t("Wydaj wyrok", "Pass the verdict"),
        "tekst": t("„Jaki wyrok dla Złotoustego?”", "“What is the verdict for Goldentongue?”"),
        "opcje": [
            {"id": "laska", "tekst": t("⚖ Łaska: niech odda dom i przeprosi", "⚖ Mercy: he returns the house and apologises"),
             "wynik": t("„Łaska?” – Sędzia Rogaty uśmiecha się po raz pierwszy. – „Rzadko to słyszę. Niech będzie.”\n\nZłotousty na kolanach drze fałszywy dokument na strzępy i przysięga, że do końca życia będzie pomagał Agacie nosić węgiel. Odcisk łapy na stole gaśnie spokojnie, jak świeca o świcie.",
                        "“Mercy?” The Horned Judge smiles for the first time. “I rarely hear that. So be it.”\n\nOn his knees, Goldentongue tears the false document to shreds and swears to help Agata carry her coal for the rest of his life. The paw mark on the table fades calmly, like a candle at dawn.")},
            {"id": "surowosc", "tekst": t("🔥 Surowość: niech straci wszystko, co zdobył oszustwem", "🔥 Severity: he loses everything he gained by cheating"),
             "wynik": t("„Surowo, ale sprawiedliwie.” Sędzia Rogaty uderza młotkiem w stół.\n\nZłote guziki Złotoustego zamieniają się w węgielki, a jego kamienice w zwykłe, mokre cegły. Odcisk łapy na stole rozbłyska ostatni raz i gaśnie.",
                        "“Severe, but just.” The Horned Judge strikes the table with his gavel.\n\nGoldentongue’s gold buttons turn into lumps of coal, and his town houses into plain, wet bricks. The paw mark on the table flares one last time and goes out.")},
        ],
    },
]

misja = {
    "seria": t("Czarci Wyrok", "The Devil’s Verdict"),
    "tylkoTest": True,
    "naMiejscu": True,
    "wymaga": {"poziom": 3},
    "adres": "Rynek 1",
    "postac": AGATA,
    "tytul": t("Czarci Wyrok", "The Devil’s Verdict"),
    "opis": t(
        "Pod Trybunałem siedzi na kamiennym schodku starsza kobieta w wyblakłej chuście i ściska w dłoniach pomięty papier.\n\n„Wdowa Agata jestem. Pan Złotousty, ten od złotych guzików i słodkich słówek, pokazał w Trybunale dokument, że mój dom przy Grodzkiej należy do niego. Pieczęć prawdziwa, podpis niby prawdziwy… a przecież ja nic nie podpisywałam! Sędziowie tylko rozłożyli ręce.\n\nA wiesz, co jest najdziwniejsze? Od tamtego dnia stary stół z wypaloną łapą – ten, który dziś stoi na Zamku – żarzy się nocami jak węgiel. Pisarz Trybunału mówi, że to znak. Że ktoś musi wydać sprawiedliwy wyrok, zanim zrobią to… inni.”",
        "On the stone steps of the Tribunal sits an elderly woman in a faded headscarf, clutching a crumpled paper.\n\n“I’m Widow Agata. Master Goldentongue – the one with the gold buttons and the sweet words – showed the Tribunal a document saying my house on Grodzka Street is his. The seal is real, the signature looks real… but I never signed anything! The judges just shrugged.\n\nAnd do you know the strangest thing? Since that day, the old table with the burnt paw mark – the one that stands in the Castle now – glows at night like an ember. The Tribunal Scribe says it is a sign. That someone must pass a just verdict before… others do.”"),
    "zadanie": etapy[0],
    "etapy": etapy,
    "zakonczenie": t(
        "Rano pod Trybunałem czeka Wdowa Agata – z kluczem do swojego domu w dłoni i łzami w oczach.\n\n„Mówili, że diabły sądzą sprawiedliwiej niż ludzie. A ja dziś zobaczyłam, że człowiek też potrafi. Dziękuję ci.”\n\nPisarz Trybunału dopisuje do kroniki nowy rozdział, a ślad łapy na starym stole jest już tylko zwykłym, ciemnym znakiem w drewnie.",
        "In the morning, Widow Agata is waiting at the Tribunal – the key to her house in her hand and tears in her eyes.\n\n“They said devils judge more fairly than people. Today I saw that a person can too. Thank you.”\n\nThe Tribunal Scribe adds a new chapter to the chronicle, and the paw mark on the old table is now just an ordinary dark mark in the wood."),
    "nagroda": 150,
    "doswiadczenie": 600,
    "przedmiot": "pioro_trybunalu",
    "tytul_bohatera": t("Sprawiedliwy", "The Just"),
}

ID = "cw_czarci_wyrok"
root = pathlib.Path(__file__).resolve().parents[2]
(root / "docs/historie/czarci-wyrok.json").write_text(json.dumps([{"id": ID, **misja}], ensure_ascii=False, indent=2) + "\n")
body = json.dumps(misja, ensure_ascii=False).replace("'", "''")
(root / "docs/sql/czarci-wyrok.sql").write_text(
    "-- „Czarci Wyrok” / „The Devil’s Verdict” (generated by scripts/historie/czarci_wyrok.py; tylkoTest = test server only).\n"
    f"insert into public.missions (id, data, active) values\n  ('{ID}', '{body}'::jsonb, true)\n"
    "on conflict (id) do update set data = excluded.data, active = excluded.active, updated_at = now();\n")
print("ok", len(etapy), "etapów")
