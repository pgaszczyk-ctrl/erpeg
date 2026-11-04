# 12 wycofanych questów — materiał do oceny

**Odrzucone przez właściciela 10.10.2026 i wyłączone w grze. Nie przywracać przy okazji konsultacji.** Właściciel ocenił paczkę jako fatalną i chce skupić się na questach sam; nie podał listy szczegółowych zarzutów do każdego scenariusza. Poniżej zachowujemy materiał, a nie dopisujemy uzasadnienia w jego imieniu.

Źródło: `runtime.json` i `catalog.json`, commit `29d1b12f1935f31ee57b68019ae865befc4bf3c1`. Pierwszy plik opisuje ostatni wykonywalny wariant; drugi również wcześniejsze projekty modułów i questów. Przy rozbieżności te zapisy nie są jedną zatwierdzoną specyfikacją. Przyjęcia wersji 1 zachowywały zapisane etapy, wersja 2 korzystała z katalogu. Nie publikujemy współrzędnych ani danych żadnej postaci.

W historycznym adapterze każde zadanie miało 10 monet i 20 EXP. To archiwalna wartość pilotażowa, nie rekomendacja balansu. Część opisanych skutków była tylko tekstem i zapisanym wyborem — np. nie dodano trwałego ogródka czy autonomicznego androida.

| ID | Tytuł PL | Etapy ostatniego wariantu | Budżet trasy w katalogu |
|---|---|---|---|
| `quest.clock_opinion` | Zegar ma własne zdanie | zagadka → zagadka → naprawa | 700 m |
| `quest.postman_stamp` | Posłaniec zgubił kolejność | rozmowa → zagadka → układanie kart | 1400 m |
| `quest.sleepy_guardian` | Strażnik chce ciszy | rozmowa → wybór → melodia | 1500 m |
| `quest.two_seals` | Nie wszystkie latarnie naraz | tropy → układanie kart → wybór → naprawa | 1800 m |
| `quest.tea_map` | Herbata na mapie | rozmowa → zagadka → zagadka | 900 m |
| `quest.flask_guardian` | Strażnik zbyt gorliwy | wybór → melodia → rozmowa | 1300 m |
| `quest.garden_wheels` | Ogródek dla małych gości | rozmowa → wybór → układanie kart | 1700 m |
| `quest.noisy_neighbours` | Czyja para hałasuje? | rozmowa → zagadka → zagadka → naprawa → wybór → układanie kart | 1100 m |
| `quest.pact_pages` | Kronika na trzy kawałki | tropy → zagadka → układanie kart | 2200 m |
| `quest.core_trip` | Rdzeń na wycieczce | wybór → układanie kart | 1500 m |
| `quest.helper_workshop` | Pomocnik uczy się pomagać | zagadka → naprawa → melodia → zagadka → wybór | 1600 m |
| `quest.old_sign_new_note` | Znajomy znak, nowa notatka | zagadka → układanie kart | 1200 m |

## quest.clock_opinion — Zegar ma własne zdanie

- Tytuł EN: The Clock Has Its Own Opinion.
- Rodzaje miejsc zleceniodawcy: `shop`, `alchemist`, `gear`, `maker`, `workshop`, `station`.
- Punkty trasy: 1; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.19, module.21. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Zegar ma własne zdanie | The Clock Has Its Own Opinion | nie / nie |
| offer | Zegar znów chodzi. Szkoda, że własnymi drogami. Każda wskazówka pokazuje co innego — pomożesz im ustalić wspólny czas? | The clock is ticking again. Keeping time apparently costs extra. Each hand gives a different reading — will you help them agree? | tak / tak |
| finish | Wreszcie jedna godzina dla wszystkich. Mój zegar nigdy nie był tak towarzyski. | At last, one time for everyone. My clock has never been so sociable. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "zagadka",
    "anchor": 0,
    "cel": {
      "textId": "quest.clock_opinion.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.clock_opinion.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wzorzec ciśnienia: 2. Czujnik A: 2. Czujnik B: 5. Który czujnik wymaga sprawdzenia?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reference pressure: 2. Sensor A: 2. Sensor B: 5. Which sensor needs checking?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.clock_opinion.runtime.3",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "A"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "A"
          }
        ]
      },
      {
        "textId": "quest.clock_opinion.runtime.4",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "B"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "B"
          }
        ]
      },
      {
        "textId": "quest.clock_opinion.runtime.5",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Oba"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Both"
          }
        ]
      }
    ],
    "dobra": 1,
    "podpowiedz": {
      "textId": "quest.clock_opinion.runtime.6",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 0,
    "cel": {
      "textId": "quest.clock_opinion.runtime.7",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.clock_opinion.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Czujnik B jest wadliwy; ciśnienie jest prawidłowe. Co naprawisz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Sensor B is faulty; the pressure is correct. What will you fix?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.clock_opinion.runtime.9",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Wymienię czujnik B"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Replace sensor B"
          }
        ]
      },
      {
        "textId": "quest.clock_opinion.runtime.10",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Podniosę ciśnienie"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Increase the pressure"
          }
        ]
      },
      {
        "textId": "quest.clock_opinion.runtime.11",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Wymienię dobry czujnik A"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Replace working sensor A"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.clock_opinion.runtime.12",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "napraw",
    "anchor": 0,
    "cel": {
      "textId": "quest.clock_opinion.runtime.13",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Dokończ naprawę przy urządzeniu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Finish the repair beside the device."
        }
      ]
    },
    "sekund": 6,
    "ile": 1
  }
]
```

## quest.postman_stamp — Posłaniec zgubił kolejność

- Tytuł EN: The Messenger Lost the Order.
- Rodzaje miejsc zleceniodawcy: `office`, `shop`, `merchant`, `station`.
- Punkty trasy: 3; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.03, module.04, module.08. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Posłaniec zgubił kolejność | The Messenger Lost the Order | nie / nie |
| offer | Posłaniec dostarczył wszystkie listy, ale pomieszał potwierdzenia. Ustalmy, którędy naprawdę jechał. | The messenger delivered every letter but mixed up the receipts. Let us work out its actual route. | nie / nie |
| finish | Listy były tam, gdzie trzeba. Tylko papierkowa robota pojechała inną drogą. | The letters were in the right places. Only the paperwork took a different route. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.postman_stamp.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.postman_stamp.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zapis trasy: koło o 09:00, trójkąt o 09:10, kwadrat o 09:20. Każdy odcinek trwa 10 minut."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Route log: circle at 09:00, triangle at 09:10, square at 09:20. Each leg takes 10 minutes."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 2,
    "cel": {
      "textId": "quest.postman_stamp.runtime.3",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.postman_stamp.runtime.4",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Świadkowie: A widział koło o 09:00; B trójkąt o 09:10; C kwadrat o 09:05. Który zapis nie pasuje do trasy?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Witnesses: A saw a circle at 09:00; B a triangle at 09:10; C a square at 09:05. Which record conflicts with the route?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.postman_stamp.runtime.5",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "A"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "A"
          }
        ]
      },
      {
        "textId": "quest.postman_stamp.runtime.6",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "B"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "B"
          }
        ]
      },
      {
        "textId": "quest.postman_stamp.runtime.7",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "C"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "C"
          }
        ]
      }
    ],
    "dobra": 2,
    "podpowiedz": {
      "textId": "quest.postman_stamp.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "uklad",
    "anchor": 0,
    "cel": {
      "textId": "quest.postman_stamp.v2.goal",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Odtwórz trasę z potwierdzeń."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reconstruct the route from the receipts."
        }
      ]
    },
    "tekst": {
      "textId": "quest.postman_stamp.v2.order",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Pieczątki zapisują czas doręczenia: koło 09:00, trójkąt 09:10, kwadrat 09:20. Wybierz kolejne potwierdzenia od najwcześniejszego."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The stamps record delivery times: circle 09:00, triangle 09:10, square 09:20. Pick the receipts from earliest to latest."
        }
      ]
    },
    "karty": [
      {
        "id": "square",
        "tekst": {
          "textId": "quest.postman_stamp.v2.card.square",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Kwadrat — 09:20"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Square — 09:20"
            }
          ]
        }
      },
      {
        "id": "circle",
        "tekst": {
          "textId": "quest.postman_stamp.v2.card.circle",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Koło — 09:00"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Circle — 09:00"
            }
          ]
        }
      },
      {
        "id": "triangle",
        "tekst": {
          "textId": "quest.postman_stamp.v2.card.triangle",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Trójkąt — 09:10"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Triangle — 09:10"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "circle",
      "triangle",
      "square"
    ],
    "podpowiedz": {
      "textId": "quest.postman_stamp.v2.hint",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj godziny pieczątek. Relacja świadka C była pomyłką, nie musimy zmieniać sprawnych zegarów."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare the stamp times. Witness C was mistaken; we do not need to alter the working clocks."
        }
      ]
    }
  }
]
```

## quest.sleepy_guardian — Strażnik chce ciszy

- Tytuł EN: The Guardian Wants Some Quiet.
- Rodzaje miejsc zleceniodawcy: `shop`, `merchant`, `library`, `station`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.12, module.25. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Strażnik chce ciszy | The Guardian Wants Some Quiet | nie / nie |
| offer | Ten mały strażnik nie chce walczyć. Po powrocie magii wszystko słyszy za głośno. Sprawdź jego reakcję i wybierz: cicha obecność albo krótka melodia. | This little guardian doesn’t want to fight. Since magic returned, everything sounds too loud. Check its reaction and choose quiet company or a short tune. | nie / nie |
| finish | Strażnik odpoczywa. Czasem pomoc polega na tym, żeby niczego nie poganiać. Nawet czegoś, co ma koła. | The guardian is resting. Sometimes helping means not rushing anyone. Even someone with wheels. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.sleepy_guardian.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.sleepy_guardian.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Mały strażnik chowa głowę przy głośnym dźwięku, ale rozluźnia skrzydła przy spokojnych nutach. Stroiciel zostawia kartę: Do, Mi, Re."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The little guardian hides its head at loud sounds, but relaxes its wings at quiet notes. The tuner leaves a card: Do, Mi, Re."
        }
      ]
    }
  },
  {
    "typ": "decyzja",
    "anchor": 1,
    "wyborKlucz": "approach",
    "cel": {
      "textId": "quest.sleepy_guardian.runtime.5",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.sleepy_guardian.runtime.6",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Strażnik już nie drży. Jak go przywitasz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The guardian has stopped trembling. How will you greet it?"
        }
      ]
    },
    "opcje": [
      {
        "id": "quiet",
        "tekst": {
          "textId": "quest.sleepy_guardian.runtime.7",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Usiądę spokojnie obok"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Sit quietly beside it"
            }
          ]
        },
        "wynik": {
          "textId": "quest.sleepy_guardian.runtime.8",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Przysuwa się bliżej. Chyba lubi spokojne towarzystwo."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "It moves closer. It seems to enjoy quiet company."
            }
          ]
        }
      },
      {
        "id": "hum",
        "tekst": {
          "textId": "quest.sleepy_guardian.runtime.9",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Zanucę poznaną melodię"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Hum the tune I learned"
            }
          ]
        },
        "wynik": {
          "textId": "quest.sleepy_guardian.runtime.10",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Odpowiada cichym pomrukiem w tym samym rytmie."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "It answers with a quiet rumble in the same rhythm."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "melodia",
    "anchor": 1,
    "cel": {
      "textId": "quest.sleepy_guardian.runtime.3",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zagraj: Do, Mi, Re."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Play: Do, Mi, Re."
        }
      ]
    },
    "tekst": {
      "textId": "quest.sleepy_guardian.v2.song",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Strażnik mruczy Mi–Re–Do, coraz ciszej. Powtórz tę opadającą melodię."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The guardian hums Mi–Re–Do, getting quieter. Repeat the falling melody."
        }
      ]
    },
    "nuty": [
      2,
      1,
      0
    ],
    "warianty": [
      {
        "klucz": "approach",
        "wartosc": "quiet",
        "etap": {
          "typ": "napraw",
          "anchor": 1,
          "cel": {
            "textId": "quest.sleepy_guardian.v2.goal.486",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Postój spokojnie przy strażniku przez chwilę."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Stay quietly beside the guardian for a moment."
              }
            ]
          },
          "sekund": 4,
          "ile": 1
        }
      }
    ]
  }
]
```

## quest.two_seals — Nie wszystkie latarnie naraz

- Tytuł EN: Not Every Lantern at Once.
- Rodzaje miejsc zleceniodawcy: `office`, `library`, `station`, `workshop`, `maker`.
- Punkty trasy: 4; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.09, module.22, module.37. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Nie wszystkie latarnie naraz | Not Every Lantern at Once | nie / nie |
| offer | Notes ma trzy puste miejsca na pieczęcie, ale do uruchomienia dwóch latarni wystarczą dowolne dwie. Wybierz, z kim porozmawiasz, i zestroj małą sieć. | The notebook has three spaces for seals, but any two will do to start the two lamps. Choose whom to meet and tune the small network. | nie / nie |
| finish | Dwie pieczęcie wystarczyły. Latarnie odpowiadają wspólnym rytmem; zachowuję twój notes z odczytami. | Two seals were enough. The lamps answer with a shared rhythm; I’ll keep your notebook and its readings. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "badanie",
    "anchor": 1,
    "cel": {
      "textId": "quest.two_seals.v2.goal.408",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zdobądź dowolne dwie pieczęcie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Collect any two seals."
        }
      ]
    },
    "ile": 2,
    "tekst": {
      "textId": "quest.two_seals.v2.investigate",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Trzej pomocnicy mają pieczęcie notesu. Odwiedź dowolnych dwóch, w wybranej kolejności. Złote znaki na mapie wskazują spotkania."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Three helpers have notebook seals. Visit any two, in whichever order you like. Gold markers show the meetings."
        }
      ]
    },
    "tropy": [
      {
        "id": "transport",
        "anchor": 1,
        "tytul": {
          "textId": "quest.two_seals.v2.clue.title.transport",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pieczęć transportu"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Transport seal"
            }
          ]
        },
        "tekst": {
          "textId": "quest.two_seals.v2.clue.text.transport",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Posłaniec przykłada pieczęć. „Sprawdzałem trasę po powrocie magii: odbiorniki działają, ale ich odczyty nie są jeszcze równe.”"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The messenger stamps your notebook. “I checked the route after magic returned: the receivers work, but their readings do not match yet.”"
            }
          ]
        }
      },
      {
        "id": "garden",
        "anchor": 2,
        "tytul": {
          "textId": "quest.two_seals.v2.clue.title.garden",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pieczęć ogrodnika"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Gardener’s seal"
            }
          ]
        },
        "tekst": {
          "textId": "quest.two_seals.v2.clue.text.garden",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Ogrodnik przykłada pieczęć. „Nasiona budzą się od ciepła. Czujnik pokazuje jednak inny wynik rano niż wieczorem — mimo tej samej temperatury.”"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The gardener stamps your notebook. “Warmth wakes the seeds. Yet the sensor gives different readings in the morning and evening, even at the same temperature.”"
            }
          ]
        }
      },
      {
        "id": "craft",
        "anchor": 3,
        "tytul": {
          "textId": "quest.two_seals.v2.clue.title.craft",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pieczęć rzemiosła"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Craft seal"
            }
          ]
        },
        "tekst": {
          "textId": "quest.two_seals.v2.clue.text.craft",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Rzemieślniczka przykłada pieczęć. „Mechanizmy są sprawne. Zanim połączymy latarnie, musimy zestroić ich odbiorniki.”"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The craftswoman stamps your notebook. “The mechanisms work. We must tune the receivers before connecting the lamps.”"
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "uklad",
    "anchor": 0,
    "cel": {
      "textId": "quest.two_seals.v2.goal.414",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zestroj odbiorniki latarni."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Tune the lamp receivers."
        }
      ]
    },
    "tekst": {
      "textId": "quest.two_seals.v2.instructions.409",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Instrukcja: najpierw porównaj odczyty, potem ustaw wspólny rytm. Podłącz zasilanie dopiero na końcu. Ułóż trzy karty."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Instructions: compare the readings first, then set a shared rhythm. Connect the power only at the end. Arrange three cards."
        }
      ]
    },
    "karty": [
      {
        "id": "connect",
        "tekst": {
          "textId": "quest.two_seals.v2.card.410",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Podłącz zasilanie"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Connect the power"
            }
          ]
        }
      },
      {
        "id": "tune",
        "tekst": {
          "textId": "quest.two_seals.v2.card.411",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Ustaw wspólny rytm"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Set a shared rhythm"
            }
          ]
        }
      },
      {
        "id": "compare",
        "tekst": {
          "textId": "quest.two_seals.v2.card.412",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Porównaj odczyty"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Compare readings"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "compare",
      "tune",
      "connect"
    ],
    "podpowiedz": {
      "textId": "quest.two_seals.v2.hint.413",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Nie zasilaj niezestrojonej sieci. Najpierw porównanie, potem wspólny rytm."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Do not power an untuned network. Compare first, then set a shared rhythm."
        }
      ]
    }
  },
  {
    "typ": "decyzja",
    "anchor": 2,
    "wyborKlucz": "battery",
    "cel": {
      "textId": "quest.two_seals.runtime.11",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.two_seals.runtime.12",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Druga latarnia czeka na podłączenie. Gdzie skierujesz zapas energii?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The second lantern awaits a connection. Where will you send the spare energy?"
        }
      ]
    },
    "opcje": [
      {
        "id": "workshop",
        "tekst": {
          "textId": "quest.two_seals.runtime.13",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Do warsztatu pomocnika"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "To the helper’s workshop"
            }
          ]
        },
        "wynik": {
          "textId": "quest.two_seals.runtime.14",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pomocnik może teraz testować czujniki."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The helper can now test sensors."
            }
          ]
        }
      },
      {
        "id": "scope",
        "tekst": {
          "textId": "quest.two_seals.runtime.15",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Do przenośnego obserwatorium"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "To the portable observatory"
            }
          ]
        },
        "wynik": {
          "textId": "quest.two_seals.runtime.16",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pomocnik może teraz odczytać smocze sygnały."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The helper can now read dragon signals."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "napraw",
    "anchor": 2,
    "cel": {
      "textId": "quest.two_seals.runtime.17",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Podłącz drugą latarnię."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Connect the second lantern."
        }
      ]
    },
    "sekund": 6,
    "ile": 1
  }
]
```

## quest.tea_map — Herbata na mapie

- Tytuł EN: Tea on the Map.
- Rodzaje miejsc zleceniodawcy: `shop`, `merchant`, `office`, `library`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.05, module.06. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Herbata na mapie | Tea on the Map | nie / nie |
| offer | Herbata rozlała się na szkicu. Poprawmy znaki, zanim ktoś zacznie szukać stacji w cukierni. | Tea spilled on the sketch. Let us fix the symbols before someone looks for the station in a cake shop. | nie / nie |
| finish | Szkic znów jest czytelny, a pieczęć rozpoznana. Herbatę odtąd stawiam na osobnym stoliku. | The sketch is readable again, and the seal has been identified. I’ll keep my tea on a separate table from now on. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.tea_map.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.tea_map.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Kartograf pokazuje szkic z plamą po herbacie. Wiesz, że ten punkt jest sklepem, ale narysował tu symbol dworca. To jego szkic, nie prawdziwa mapa."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The cartographer shows a tea-stained sketch. You know this point is a shop, but he drew a station symbol here. This is his sketch, not the actual map."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 1,
    "cel": {
      "textId": "quest.tea_map.runtime.3",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.tea_map.runtime.4",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Jaki symbol powinien mieć sklep na szkicu?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Which symbol should the shop have on the sketch?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.tea_map.runtime.5",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Sklep"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Shop"
          }
        ]
      },
      {
        "textId": "quest.tea_map.runtime.6",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Dworzec"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Station"
          }
        ]
      },
      {
        "textId": "quest.tea_map.runtime.7",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Jezioro"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Lake"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.tea_map.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 0,
    "cel": {
      "textId": "quest.tea_map.runtime.9",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.tea_map.runtime.10",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zaufany znak: trzy zęby koła nad kropką. Którą pieczęć zaakceptujesz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Trusted mark: three gear teeth above a dot. Which seal will you accept?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.tea_map.runtime.11",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Trzy zęby nad kropką"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Three teeth above a dot"
          }
        ]
      },
      {
        "textId": "quest.tea_map.runtime.12",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Dwa zęby pod kropką"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Two teeth below a dot"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.tea_map.runtime.13",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  }
]
```

## quest.flask_guardian — Strażnik zbyt gorliwy

- Tytuł EN: An Overenthusiastic Guardian.
- Rodzaje miejsc zleceniodawcy: `workshop`, `maker`, `alchemist`, `gear`, `shop`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.18, module.20, module.28. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Strażnik zbyt gorliwy | An Overenthusiastic Guardian | nie / nie |
| offer | Strażnik alarmuje na każdy szelest i grzeje regulator. Mam dwie próbki: liść do strojenia filtra albo wodę do układu chłodzącego. Wybierz metodę i sprawdź ją na miejscu. | The guardian sounds an alarm at every rustle and overheats its regulator. I have two samples: leaf for tuning the filter, or water for a cooling system. Choose a method and test it on site. | nie / nie |
| finish | Strażnik rozpoznaje spokojny sygnał. O własnym cieniu wciąż ma kilka pytań, ale już nie zwołuje na nie całego miasta. | The guardian recognises a calm signal. It still has questions about its own shadow, but no longer summons the whole town to answer them. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "decyzja",
    "anchor": 0,
    "wyborKlucz": "essence",
    "cel": {
      "textId": "quest.flask_guardian.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.flask_guardian.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Pomocnik daje dwie próbki i obie instrukcje. Esencja liścia wycisza czujnik, esencja wody chłodzi regulator. Wybierz sposób uspokojenia strażnika."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The helper supplies two samples and both instructions. Leaf essence quiets the sensor; water essence cools the regulator. Choose how to settle the guardian."
        }
      ]
    },
    "opcje": [
      {
        "id": "leaf",
        "tekst": {
          "textId": "quest.flask_guardian.runtime.3",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Liść: filtr wyciszający"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Leaf: quieting filter"
            }
          ]
        },
        "wynik": {
          "textId": "quest.flask_guardian.runtime.4",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wybrano filtr wyciszający."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Quieting filter selected."
            }
          ]
        }
      },
      {
        "id": "water",
        "tekst": {
          "textId": "quest.flask_guardian.runtime.5",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Woda: podkładka chłodząca"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Water: cooling pad"
            }
          ]
        },
        "wynik": {
          "textId": "quest.flask_guardian.runtime.6",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wybrano podkładkę chłodzącą."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Cooling pad selected."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "melodia",
    "anchor": 1,
    "cel": {
      "textId": "quest.flask_guardian.v2.goal.450",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Dostrój filtr wyciszający."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Tune the quieting filter."
        }
      ]
    },
    "tekst": {
      "textId": "quest.flask_guardian.v2.leaf",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Filtr liścia przepuszcza spokojny rytm Do–Re–Do. Powtórz go, żeby strażnik odróżniał ten sygnał od szelestu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The leaf filter passes the calm rhythm Do–Re–Do. Repeat it so the guardian can distinguish that signal from rustling."
        }
      ]
    },
    "nuty": [
      0,
      1,
      0
    ],
    "warianty": [
      {
        "klucz": "essence",
        "wartosc": "water",
        "etap": {
          "typ": "uklad",
          "anchor": 1,
          "cel": {
            "textId": "quest.flask_guardian.v2.goal.456",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Złóż układ chłodzący."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Assemble the cooling system."
              }
            ]
          },
          "tekst": {
            "textId": "quest.flask_guardian.v2.instructions.451",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Podkładka odprowadza ciepło z regulatora do żeberek, a potem do powietrza. Ułóż elementy zgodnie z drogą ciepła."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "The pad carries heat from the regulator to the fins, then into the air. Arrange the parts along the heat’s path."
              }
            ]
          },
          "karty": [
            {
              "id": "fins",
              "tekst": {
                "textId": "quest.flask_guardian.v2.card.452",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Żeberka"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Fins"
                  }
                ]
              }
            },
            {
              "id": "pad",
              "tekst": {
                "textId": "quest.flask_guardian.v2.card.453",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Podkładka"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Cooling pad"
                  }
                ]
              }
            },
            {
              "id": "regulator",
              "tekst": {
                "textId": "quest.flask_guardian.v2.card.454",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Regulator"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Regulator"
                  }
                ]
              }
            }
          ],
          "kolejnosc": [
            "regulator",
            "pad",
            "fins"
          ],
          "podpowiedz": {
            "textId": "quest.flask_guardian.v2.hint.455",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Podkładka musi dotykać regulatora, a żeberka odbierają od niej ciepło."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "The pad touches the regulator, and the fins carry heat away from the pad."
              }
            ]
          }
        }
      }
    ]
  },
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.flask_guardian.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.flask_guardian.runtime.9",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Strażnik przestaje alarmować na każdy szelest. Przepuszcza nawet własny cień."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The guardian stops raising the alarm at every rustle. It even lets its own shadow pass."
        }
      ]
    }
  }
]
```

## quest.garden_wheels — Ogródek dla małych gości

- Tytuł EN: A Garden for Little Visitors.
- Rodzaje miejsc zleceniodawcy: `merchant`, `shop`, `library`, `office`.
- Punkty trasy: 3; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.16, module.24, module.33. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Ogródek dla małych gości | A Garden for Little Visitors | nie / nie |
| offer | Mam składane donice i trzy rodzaje nasion: zapach, blask, cień. Wybierz parę i zbuduj kącik w pobliskiej zieleni. Ogródek jest przenośny; ślimaki jeszcze nie dostały rozkładu jazdy. | I have folding planters and three kinds of seed: scent, glow, shade. Choose a pair and build a corner in nearby greenery. The garden is portable; the snails haven’t received the timetable yet. | nie / nie |
| finish | Twój układ donic jest gotowy. Pomocnik zapisuje parę nasion i sposób montażu, żeby nie pomylić przewodu z korzeniem. | Your planter arrangement is ready. The helper records the seed pair and assembly method so it won’t confuse a wire with a root. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.garden_wheels.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.garden_wheels.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Pomocnik przyniósł ładowarkę i składaną ławkę. Trzy próbki nasion dają zapach, blask albo cień. Każda para ma inny efekt."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The helper brought a charger and a folding bench. Three seed samples give scent, glow, or shade. Each pair has a different effect."
        }
      ]
    }
  },
  {
    "typ": "decyzja",
    "anchor": 2,
    "wyborKlucz": "seeds",
    "cel": {
      "textId": "quest.garden_wheels.runtime.3",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.garden_wheels.runtime.4",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz dwie różne próbki do małej rabaty."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose two different samples for a little garden bed."
        }
      ]
    },
    "opcje": [
      {
        "id": "scent_glow",
        "tekst": {
          "textId": "quest.garden_wheels.runtime.5",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Zapach + blask"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Scent + glow"
            }
          ]
        },
        "wynik": {
          "textId": "quest.garden_wheels.v2.choice.scent_glow",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wybrano zapach i blask. Teraz zamontuj przewód i posadź nasiona."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Scent and glow selected. Now fit the wire and plant the seeds."
            }
          ]
        }
      },
      {
        "id": "scent_shade",
        "tekst": {
          "textId": "quest.garden_wheels.runtime.7",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Zapach + cień"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Scent + shade"
            }
          ]
        },
        "wynik": {
          "textId": "quest.garden_wheels.v2.choice.scent_shade",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wybrano zapach i cień. Teraz zamontuj osłonę i posadź nasiona."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Scent and shade selected. Now fit the shade and plant the seeds."
            }
          ]
        }
      },
      {
        "id": "glow_shade",
        "tekst": {
          "textId": "quest.garden_wheels.runtime.9",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Blask + cień"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Glow + shade"
            }
          ]
        },
        "wynik": {
          "textId": "quest.garden_wheels.v2.choice.glow_shade",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wybrano blask i cień. Teraz ustaw osłonę, lampkę i nasiona."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Glow and shade selected. Now set up the shade, lamp and seeds."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "uklad",
    "anchor": 2,
    "cel": {
      "textId": "quest.garden_wheels.v2.goal.464",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zbuduj wybrany kącik wśród zieleni."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Build your chosen corner in the greenery."
        }
      ]
    },
    "tekst": {
      "textId": "quest.garden_wheels.v2.instructions.459",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Pachnące, świecące donice: najpierw ustaw donice, potem przewód lampki. Nasiona trafiają do nich na końcu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Scented, glowing planters: place the pots first, then the lamp wire. Add the seeds last."
        }
      ]
    },
    "karty": [
      {
        "id": "seeds",
        "tekst": {
          "textId": "quest.garden_wheels.v2.card.460",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Nasiona"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Seeds"
            }
          ]
        }
      },
      {
        "id": "wire",
        "tekst": {
          "textId": "quest.garden_wheels.v2.card.461",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Przewód lampki"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Lamp wire"
            }
          ]
        }
      },
      {
        "id": "pots",
        "tekst": {
          "textId": "quest.garden_wheels.v2.card.462",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Donice"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Pots"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "pots",
      "wire",
      "seeds"
    ],
    "podpowiedz": {
      "textId": "quest.garden_wheels.v2.hint.463",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Donice podtrzymują instalację; nasiona sadzimy po montażu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The pots support the installation; plant the seeds after assembly."
        }
      ]
    },
    "warianty": [
      {
        "klucz": "seeds",
        "wartosc": "scent_shade",
        "etap": {
          "typ": "uklad",
          "anchor": 2,
          "cel": {
            "textId": "quest.garden_wheels.v2.goal.470",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zbuduj wybrany kącik wśród zieleni."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Build your chosen corner in the greenery."
              }
            ]
          },
          "tekst": {
            "textId": "quest.garden_wheels.v2.instructions.465",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Pachnący kącik: ustaw donice, zamontuj osłonę, potem posadź nasiona."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Scented nook: place the pots, fit the shade, then plant the seeds."
              }
            ]
          },
          "karty": [
            {
              "id": "seeds",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.466",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Nasiona"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Seeds"
                  }
                ]
              }
            },
            {
              "id": "shade",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.467",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Osłona"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Shade"
                  }
                ]
              }
            },
            {
              "id": "pots",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.468",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Donice"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Pots"
                  }
                ]
              }
            }
          ],
          "kolejnosc": [
            "pots",
            "shade",
            "seeds"
          ],
          "podpowiedz": {
            "textId": "quest.garden_wheels.v2.hint.469",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zwróć uwagę, co podtrzymuje instalację. Nasiona zawsze trafiają na końcu."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Notice what supports the installation. The seeds always go last."
              }
            ]
          }
        }
      },
      {
        "klucz": "seeds",
        "wartosc": "glow_shade",
        "etap": {
          "typ": "uklad",
          "anchor": 2,
          "cel": {
            "textId": "quest.garden_wheels.v2.goal.476",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zbuduj wybrany kącik wśród zieleni."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Build your chosen corner in the greenery."
              }
            ]
          },
          "tekst": {
            "textId": "quest.garden_wheels.v2.instructions.471",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zacienione światło: postaw osłonę, poprowadź przewód lampki, a potem posadź nasiona."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Shaded light: set up the shade, run the lamp wire, then plant the seeds."
              }
            ]
          },
          "karty": [
            {
              "id": "seeds",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.472",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Nasiona"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Seeds"
                  }
                ]
              }
            },
            {
              "id": "wire",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.473",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Przewód lampki"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Lamp wire"
                  }
                ]
              }
            },
            {
              "id": "shade",
              "tekst": {
                "textId": "quest.garden_wheels.v2.card.474",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Osłona"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Shade"
                  }
                ]
              }
            }
          ],
          "kolejnosc": [
            "shade",
            "wire",
            "seeds"
          ],
          "podpowiedz": {
            "textId": "quest.garden_wheels.v2.hint.475",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zwróć uwagę, co podtrzymuje instalację. Nasiona zawsze trafiają na końcu."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Notice what supports the installation. The seeds always go last."
              }
            ]
          }
        }
      }
    ]
  }
]
```

## quest.noisy_neighbours — Czyja para hałasuje?

- Tytuł EN: Whose Steam Is Making That Noise?.
- Rodzaje miejsc zleceniodawcy: `office`, `shop`, `maker`, `workshop`.
- Punkty trasy: 3; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.03, module.19, module.30. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Czyja para hałasuje? | Whose Steam Is Making That Noise? | nie / nie |
| offer | Dwaj sąsiedzi słyszą ten sam stuk i obwiniają siebie nawzajem. Sprawdźmy, skąd naprawdę dochodzi. | Two neighbours hear the same tapping and blame each other. Let us find where it really comes from. | nie / nie |
| finish | Luźny wspólny regulator, żadnego sabotażu. Teraz można porozmawiać przy herbacie. | A loose shared regulator, no sabotage. Now they can talk over tea. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "rozmowa",
    "anchor": 1,
    "cel": {
      "textId": "quest.noisy_neighbours.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porozmawiaj z pomocnikiem."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Talk to the helper."
        }
      ]
    },
    "tekst": {
      "textId": "quest.noisy_neighbours.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sąsiadka słyszała hałas o 08:00, choć jej maszyna była wyłączona. Sąsiad potwierdza to samo. Wspólny regulator działał."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The neighbour heard a noise at 08:00 although her machine was off. The other neighbour reports the same. The shared regulator was running."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 2,
    "cel": {
      "textId": "quest.noisy_neighbours.runtime.3",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.noisy_neighbours.runtime.4",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Obie prywatne maszyny były wyłączone. Który sprzęt sprawdzisz najpierw?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Both private machines were off. Which equipment will you check first?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.noisy_neighbours.runtime.5",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Wspólny regulator"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "The shared regulator"
          }
        ]
      },
      {
        "textId": "quest.noisy_neighbours.runtime.6",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Maszynę sąsiadki"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "The first neighbour’s machine"
          }
        ]
      },
      {
        "textId": "quest.noisy_neighbours.runtime.7",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Maszynę sąsiada"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "The other neighbour’s machine"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.noisy_neighbours.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "zagadka",
    "anchor": 2,
    "cel": {
      "textId": "quest.noisy_neighbours.runtime.9",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.noisy_neighbours.runtime.10",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wzorzec: 4. Luźno zamocowany czujnik regulatora: 7. Co naprawisz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reference: 4. Loosely mounted regulator sensor: 7. What will you fix?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.noisy_neighbours.runtime.11",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Mocowanie czujnika"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "The sensor mount"
          }
        ]
      },
      {
        "textId": "quest.noisy_neighbours.runtime.12",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Wszystkie maszyny naraz"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "All machines at once"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.noisy_neighbours.runtime.13",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "napraw",
    "anchor": 2,
    "cel": {
      "textId": "quest.noisy_neighbours.runtime.14",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Dokończ naprawę przy urządzeniu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Finish the repair beside the device."
        }
      ]
    },
    "sekund": 6,
    "ile": 1
  },
  {
    "typ": "decyzja",
    "anchor": 0,
    "wyborKlucz": "schedule",
    "cel": {
      "textId": "quest.noisy_neighbours.runtime.15",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.noisy_neighbours.runtime.16",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Rano sąsiadka potrzebuje ciszy, po południu sąsiad potrzebuje pompy. Jak to pogodzisz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "One neighbour needs quiet mornings; the other needs the pump in the afternoon. How will you arrange it?"
        }
      ]
    },
    "opcje": [
      {
        "id": "schedule",
        "tekst": {
          "textId": "quest.noisy_neighbours.runtime.17",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Cichy tryb rano, pompa po południu"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Quiet mode in the morning, pump in the afternoon"
            }
          ]
        },
        "wynik": {
          "textId": "quest.noisy_neighbours.runtime.18",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Oboje zgadzają się na plan."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Both agree to the plan."
            }
          ]
        }
      },
      {
        "id": "insulate",
        "tekst": {
          "textId": "quest.noisy_neighbours.runtime.19",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wyciszę obudowę i zostawię pompę na popołudnie"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Insulate the casing and schedule the pump for afternoons"
            }
          ]
        },
        "wynik": {
          "textId": "quest.noisy_neighbours.runtime.20",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Oboje zgadzają się przetestować wyciszenie."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Both agree to test the insulation."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "uklad",
    "anchor": 0,
    "cel": {
      "textId": "quest.noisy_neighbours.v2.goal.502",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wprowadź wybrane rozwiązanie sąsiadów."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Apply the neighbours’ chosen solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.noisy_neighbours.v2.instructions.497",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Spokojne poranki, praca pompy po południu, a na koniec wieczorny odczyt. Ułóż trzy karty planu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Quiet mornings, pump work in the afternoon, then an evening reading. Arrange the three schedule cards."
        }
      ]
    },
    "karty": [
      {
        "id": "evening",
        "tekst": {
          "textId": "quest.noisy_neighbours.v2.card.498",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wieczór: odczyt"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Evening: reading"
            }
          ]
        }
      },
      {
        "id": "afternoon",
        "tekst": {
          "textId": "quest.noisy_neighbours.v2.card.499",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Popołudnie: pompa"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Afternoon: pump"
            }
          ]
        }
      },
      {
        "id": "morning",
        "tekst": {
          "textId": "quest.noisy_neighbours.v2.card.500",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Rano: cisza"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Morning: quiet"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "morning",
      "afternoon",
      "evening"
    ],
    "podpowiedz": {
      "textId": "quest.noisy_neighbours.v2.hint.501",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Ułóż pory dnia od najwcześniejszej."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Arrange the times of day from earliest to latest."
        }
      ]
    },
    "warianty": [
      {
        "klucz": "schedule",
        "wartosc": "insulate",
        "etap": {
          "typ": "napraw",
          "anchor": 2,
          "cel": {
            "textId": "quest.noisy_neighbours.v2.goal.503",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Zamontuj izolację przy wspólnej pompie."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Fit insulation to the shared pump."
              }
            ]
          },
          "sekund": 4,
          "ile": 1
        }
      }
    ]
  }
]
```

## quest.pact_pages — Kronika na trzy kawałki

- Tytuł EN: A Chronicle in Three Pieces.
- Rodzaje miejsc zleceniodawcy: `library`, `university`, `school`, `office`, `shop`.
- Punkty trasy: 4; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.02, module.07, module.35. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Kronika na trzy kawałki | A Chronicle in Three Pieces | nie / nie |
| offer | Kronikarz pomieszał karty Paktu, a odbiorniki łapią po dwa sektory naraz. Zbadaj wybrane urządzenia i odtwórz opowieść. Ja potrzymam kartki. Wiatr już próbował zostać bibliotekarzem. | The chronicler mixed up the Pact cards, and each receiver picks up two sectors at once. Inspect the devices you choose and reconstruct the story. I’ll hold the pages. The wind has already applied for the librarian’s job. | nie / nie |
| finish | Zapis pasuje: Pakt, wojna, sen, a potem przebudzenie po Komecie. Urządzenia pamiętają rytm, choć my musieliśmy go sobie przypomnieć. | The record fits: Pact, war, sleep, then awakening after the Comet. The devices remember the rhythm, even though we had to rediscover it. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "badanie",
    "anchor": 1,
    "cel": {
      "textId": "quest.pact_pages.v2.goal.424",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj dowolne dwa odbiorniki."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare any two receivers."
        }
      ]
    },
    "ile": 2,
    "tekst": {
      "textId": "quest.pact_pages.v2.investigate",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Każdy odbiornik wskazuje dwa sektory. Zbadaj dwa z trzech i znajdź sektor wspólny dla ich odczytów."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Each receiver points to two sectors. Inspect any two of the three and find the sector shared by their readings."
        }
      ]
    },
    "tropy": [
      {
        "id": "receiver_ab",
        "anchor": 1,
        "tytul": {
          "textId": "quest.pact_pages.v2.clue.title.receiver_ab",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Odbiornik z kołem"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Gear receiver"
            }
          ]
        },
        "tekst": {
          "textId": "quest.pact_pages.v2.clue.text.receiver_ab",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Igła przeskakuje między sektorami A i B. W notesie zapisujesz: {A, B}."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The needle jumps between sectors A and B. You note: {A, B}."
            }
          ]
        }
      },
      {
        "id": "receiver_bc",
        "anchor": 2,
        "tytul": {
          "textId": "quest.pact_pages.v2.clue.title.receiver_bc",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Odbiornik z liściem"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Leaf receiver"
            }
          ]
        },
        "tekst": {
          "textId": "quest.pact_pages.v2.clue.text.receiver_bc",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Igła przeskakuje między sektorami B i C. W notesie zapisujesz: {B, C}."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The needle jumps between sectors B and C. You note: {B, C}."
            }
          ]
        }
      },
      {
        "id": "receiver_bd",
        "anchor": 3,
        "tytul": {
          "textId": "quest.pact_pages.v2.clue.title.receiver_bd",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Odbiornik ze skrzydłem"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Wing receiver"
            }
          ]
        },
        "tekst": {
          "textId": "quest.pact_pages.v2.clue.text.receiver_bd",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Igła przeskakuje między sektorami B i D. W notesie zapisujesz: {B, D}."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The needle jumps between sectors B and D. You note: {B, D}."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "zagadka",
    "anchor": 0,
    "cel": {
      "textId": "quest.pact_pages.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.pact_pages.v2.sector",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Spójrz na dwa odczyty w notesie. Który sektor występuje w obu?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Look at the two readings in your notebook. Which sector appears in both?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.pact_pages.runtime.3",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "A"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "A"
          }
        ]
      },
      {
        "textId": "quest.pact_pages.runtime.4",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "B"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "B"
          }
        ]
      },
      {
        "textId": "quest.pact_pages.runtime.5",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "C"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "C"
          }
        ]
      }
    ],
    "dobra": 1,
    "podpowiedz": {
      "textId": "quest.pact_pages.v2.sector_hint",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Szukasz wspólnej litery, nie sumy wszystkich sektorów. Odczyty pozostają w dzienniku zadania."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Look for a shared letter, not all the sectors combined. Your readings remain in the quest journal."
        }
      ]
    }
  },
  {
    "typ": "uklad",
    "anchor": 0,
    "cel": {
      "textId": "quest.pact_pages.v2.goal.432",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Odtwórz zapis Paktu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reconstruct the Pact record."
        }
      ]
    },
    "tekst": {
      "textId": "quest.pact_pages.v2.instructions.427",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Trzy ilustracje opisują historię. Smoki zasilały maszyny podczas Paktu. Wojna o Tryby zerwała współpracę i smoki odeszły w sen. Później Kometa je obudziła. Ułóż ilustracje od najstarszej."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Three pictures tell the story. Dragons powered machines during the Pact. The War of Gears broke the partnership and the dragons left to sleep. Later, the Comet woke them. Put the oldest picture first."
        }
      ]
    },
    "karty": [
      {
        "id": "comet",
        "tekst": {
          "textId": "quest.pact_pages.v2.card.428",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Kometa: przebudzenie"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Comet: awakening"
            }
          ]
        }
      },
      {
        "id": "war",
        "tekst": {
          "textId": "quest.pact_pages.v2.card.429",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wojna: odejście smoków"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "War: dragons depart"
            }
          ]
        }
      },
      {
        "id": "pact",
        "tekst": {
          "textId": "quest.pact_pages.v2.card.430",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pakt: wspólna energia"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Pact: shared energy"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "pact",
      "war",
      "comet"
    ],
    "podpowiedz": {
      "textId": "quest.pact_pages.v2.hint.431",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Kometa budzi smoki, nie usypia. Ich sen nastąpił po wojnie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The Comet wakes the dragons, rather than putting them to sleep. Their sleep followed the war."
        }
      ]
    }
  }
]
```

## quest.core_trip — Rdzeń na wycieczce

- Tytuł EN: A Core on an Outing.
- Rodzaje miejsc zleceniodawcy: `workshop`, `maker`, `alchemist`, `gear`, `shop`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.17, module.23, module.21. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Rdzeń na wycieczce | A Core on an Outing | nie / nie |
| offer | Regulator gubi rytm. Możesz wybrać pełny reset albo delikatną kalibrację. Po drodze rdzeń ma własne zasilanie; nie musisz się ścigać ani kupować części. | The regulator keeps losing its rhythm. Choose a full reset or gentle calibration. The core has its own power supply for the trip; no race or parts purchase is needed. | nie / nie |
| finish | Regulator utrzymuje rytm. Twój wybrany sposób naprawy trafił do instrukcji pomocnika. | The regulator holds its rhythm. Your chosen repair method has been added to the helper’s manual. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "decyzja",
    "anchor": 0,
    "wyborKlucz": "mode",
    "cel": {
      "textId": "quest.core_trip.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.core_trip.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Regulator drga. Plan przewiduje dwie naprawy: mocny reset albo precyzyjne ustawienie według wzorca. Obie są poprawne. Zasilacz podróżny pokrywa całą sprawdzoną trasę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The regulator shakes. The plan allows two repairs: a powered reset or precise calibration against the reference. Both work. The portable supply covers the entire verified route."
        }
      ]
    },
    "opcje": [
      {
        "id": "power",
        "tekst": {
          "textId": "quest.core_trip.runtime.3",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Tryb mocy: reset"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Power mode: reset"
            }
          ]
        },
        "wynik": {
          "textId": "quest.core_trip.runtime.4",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Ustawiono tryb mocy."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Power mode selected."
            }
          ]
        }
      },
      {
        "id": "precision",
        "tekst": {
          "textId": "quest.core_trip.runtime.5",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Tryb precyzji: kalibracja"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Precision mode: calibration"
            }
          ]
        },
        "wynik": {
          "textId": "quest.core_trip.runtime.6",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Ustawiono tryb precyzji."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Precision mode selected."
            }
          ]
        }
      }
    ]
  },
  {
    "typ": "uklad",
    "anchor": 1,
    "cel": {
      "textId": "quest.core_trip.v2.goal.440",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Uruchom regulator w wybranym trybie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Start the regulator in your chosen mode."
        }
      ]
    },
    "tekst": {
      "textId": "quest.core_trip.v2.instructions.435",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Reset ma trzy kroki. Odłącz rdzeń, wyzeruj licznik i dopiero potem ponownie podłącz rdzeń."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The reset has three steps. Disconnect the core, clear the counter, and only then reconnect the core."
        }
      ]
    },
    "karty": [
      {
        "id": "connect",
        "tekst": {
          "textId": "quest.core_trip.v2.card.436",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Podłącz rdzeń"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Connect core"
            }
          ]
        }
      },
      {
        "id": "clear",
        "tekst": {
          "textId": "quest.core_trip.v2.card.437",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Wyzeruj licznik"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Clear counter"
            }
          ]
        }
      },
      {
        "id": "disconnect",
        "tekst": {
          "textId": "quest.core_trip.v2.card.438",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Odłącz rdzeń"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Disconnect core"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "disconnect",
      "clear",
      "connect"
    ],
    "podpowiedz": {
      "textId": "quest.core_trip.v2.hint.439",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Najpierw odłącz zasilanie, a podłącz je na końcu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Disconnect power first; reconnect it last."
        }
      ]
    },
    "warianty": [
      {
        "klucz": "mode",
        "wartosc": "precision",
        "etap": {
          "typ": "uklad",
          "anchor": 1,
          "cel": {
            "textId": "quest.core_trip.v2.goal.446",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Dostrój regulator według wzorca."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "Tune the regulator to the reference."
              }
            ]
          },
          "tekst": {
            "textId": "quest.core_trip.v2.instructions.441",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Wzorzec wyznacza rosnący rytm: krótki impuls, średni impuls, długi impuls. Ustaw trzy płytki w tej kolejności."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "The reference gives a rising rhythm: short pulse, medium pulse, long pulse. Arrange the three plates in that order."
              }
            ]
          },
          "karty": [
            {
              "id": "long",
              "tekst": {
                "textId": "quest.core_trip.v2.card.442",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Długi impuls"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Long pulse"
                  }
                ]
              }
            },
            {
              "id": "medium",
              "tekst": {
                "textId": "quest.core_trip.v2.card.443",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Średni impuls"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Medium pulse"
                  }
                ]
              }
            },
            {
              "id": "short",
              "tekst": {
                "textId": "quest.core_trip.v2.card.444",
                "variants": [
                  {
                    "language": "pl",
                    "localHumor": false,
                    "text": "Krótki impuls"
                  },
                  {
                    "language": "en",
                    "localHumor": false,
                    "text": "Short pulse"
                  }
                ]
              }
            }
          ],
          "kolejnosc": [
            "short",
            "medium",
            "long"
          ],
          "podpowiedz": {
            "textId": "quest.core_trip.v2.hint.445",
            "variants": [
              {
                "language": "pl",
                "localHumor": false,
                "text": "Długość impulsów ma rosnąć."
              },
              {
                "language": "en",
                "localHumor": false,
                "text": "The pulses should get longer."
              }
            ]
          }
        }
      }
    ]
  }
]
```

## quest.helper_workshop — Pomocnik uczy się pomagać

- Tytuł EN: A Helper Learns to Help.
- Rodzaje miejsc zleceniodawcy: `maker`, `workshop`, `gear`, `alchemist`, `shop`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: brak.
- Moduły historycznego projektu: module.31, module.29, module.36. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Pomocnik uczy się pomagać | A Helper Learns to Help | nie / nie |
| offer | Pomocnik zapamiętał klucz i teraz chce nim naprawiać wszystko. Pokaż mu dwa różne przypadki, a potem sprawdź, co zapamiętał. Klucz przy melodii brzmi głównie jak klucz. | The helper learned about a spanner and now wants to fix everything with it. Show it two different cases, then test what it learned. A spanner playing a tune mostly sounds like a spanner. | nie / nie |
| finish | Pomocnik poprawił regułę: najpierw objawy, potem narzędzie. Twój wybór jego specjalności zostaje w notesie warsztatu. | The helper corrected its rule: symptoms first, tool second. Your choice of its speciality remains in the workshop notebook. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "zagadka",
    "anchor": 0,
    "cel": {
      "textId": "quest.helper_workshop.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.helper_workshop.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Jeden klucz, dwie usterki: A ma luźną śrubę, B ma złą melodię. Instrukcja B pokazuje Do, Mi, Re. Jak wykorzystasz klucz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "One spanner, two faults: A has a loose screw, B has the wrong tune. B’s instructions show Do, Mi, Re. How will you use the spanner?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.helper_workshop.runtime.3",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Dokręcę A; B poprawię melodią"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Tighten A; correct B with the tune"
          }
        ]
      },
      {
        "textId": "quest.helper_workshop.runtime.4",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Uderzę kluczem w oba urządzenia"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Hit both devices with the spanner"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.helper_workshop.runtime.5",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "napraw",
    "anchor": 0,
    "cel": {
      "textId": "quest.helper_workshop.runtime.6",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Dokończ naprawę przy urządzeniu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Finish the repair beside the device."
        }
      ]
    },
    "sekund": 6,
    "ile": 1
  },
  {
    "typ": "melodia",
    "anchor": 1,
    "cel": {
      "textId": "quest.helper_workshop.runtime.7",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zagraj: Do, Mi, Re."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Play: Do, Mi, Re."
        }
      ]
    },
    "tekst": {
      "textId": "quest.helper_workshop.runtime.8",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Karta stroiciela: słońce = Do, liść = Mi, księżyc = Re. Zagraj w tej kolejności."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The tuner’s card: sun = Do, leaf = Mi, moon = Re. Play in that order."
        }
      ]
    },
    "nuty": [
      0,
      2,
      1
    ]
  },
  {
    "typ": "zagadka",
    "anchor": 1,
    "cel": {
      "textId": "quest.helper_workshop.v2.goal.494",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź, czego nauczył się pomocnik."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Test what the helper has learned."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.helper_workshop.v2.test",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Nowe urządzenie C nie ma luźnej śruby, a jego odbiornik mruczy Do–Mi–Re. Pomocnik proponuje użyć klucza, tak jak przy A. Jak go poprawisz?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "New device C has no loose screw, and its receiver hums Do–Mi–Re. The helper suggests using a spanner, just as it did for A. How will you correct it?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.helper_workshop.v2.test.a",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Najpierw odczytaj objawy C; tu potrzebna jest melodia."
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Read C’s symptoms first; this one needs a tune."
          }
        ]
      },
      {
        "textId": "quest.helper_workshop.v2.test.b",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Klucz pasuje do każdej awarii."
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "A spanner fixes every fault."
          }
        ]
      },
      {
        "textId": "quest.helper_workshop.v2.test.c",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Pomiń sprawdzenie i wymień całe urządzenie."
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Skip the inspection and replace the whole device."
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.helper_workshop.v2.test.hint",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Przenoś sposób sprawdzania, a nie narzędzie z poprzedniego zadania."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reuse the method of checking, rather than the tool from the previous task."
        }
      ]
    }
  },
  {
    "typ": "decyzja",
    "anchor": 1,
    "wyborKlucz": "service",
    "cel": {
      "textId": "quest.helper_workshop.runtime.9",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Wybierz rozwiązanie."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Choose a solution."
        }
      ]
    },
    "tekst": {
      "textId": "quest.helper_workshop.runtime.10",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Automat zapamiętał: najpierw oględziny, potem narzędzie. Jakiego rodzaju wskazówki ma ci udzielać?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The automaton learned: inspect first, use a tool second. What kind of clues should it give you?"
        }
      ]
    },
    "opcje": [
      {
        "id": "repair",
        "tekst": {
          "textId": "quest.helper_workshop.runtime.11",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "O naprawach"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Repair clues"
            }
          ]
        },
        "wynik": {
          "textId": "quest.helper_workshop.runtime.12",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pomocnik zapisuje: sprawdź wzorzec przed wymianą części."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The helper records: check the reference before replacing parts."
            }
          ]
        }
      },
      {
        "id": "route",
        "tekst": {
          "textId": "quest.helper_workshop.runtime.13",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "O trasach"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Route clues"
            }
          ]
        },
        "wynik": {
          "textId": "quest.helper_workshop.runtime.14",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pomocnik zapisuje: szukaj połączonych dróg, nie samych punktów."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The helper records: look for connected roads, not just points."
            }
          ]
        }
      },
      {
        "id": "creature",
        "tekst": {
          "textId": "quest.helper_workshop.runtime.15",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "O stworzeniach"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Creature clues"
            }
          ]
        },
        "wynik": {
          "textId": "quest.helper_workshop.runtime.16",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Pomocnik zapisuje: przyjrzyj się reakcji, zanim podejdziesz."
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "The helper records: observe the reaction before approaching."
            }
          ]
        }
      }
    ]
  }
]
```

## quest.old_sign_new_note — Znajomy znak, nowa notatka

- Tytuł EN: An Old Symbol, a New Note.
- Rodzaje miejsc zleceniodawcy: `library`, `office`, `shop`, `merchant`.
- Punkty trasy: 2; `anchor` to indeks punktu, a nie stały adres Lublina.
- Wymagane wcześniejsze zadania: `quest.tea_map`, `quest.two_seals`.
- Moduły historycznego projektu: module.40, module.39, module.34. Nie utożsamiać ich automatycznie z pełnymi mechanikami silnika.

| Tekst | PL | EN | Lokalny humor PL / EN |
|---|---|---|---|
| title | Znajomy znak, nowa notatka | An Old Symbol, a New Note | nie / nie |
| offer | Ta pieczęć była na poprawionej mapie. Teraz znajdziemy przy niej odczyt sprzed uruchomienia latarni. | That seal was on the corrected map. Now we can find a reading from before the lantern was activated. | nie / nie |
| finish | Zmiana wyjaśniona, dekoracja odzyskała wzór. Wcześniejsza przygoda naprawdę nam się przydała. | The change is explained and the decoration has its pattern back. Our earlier adventure really helped. | nie / nie |

Ostatnie etapy, opcje, podpowiedzi, odpowiedzi, karty i warianty zależne od decyzji. Referencje tekstów rozwinięto do PL/EN wraz z metadanymi; to zapis konsultacyjny, nie obiekt do importu do gry. Warianty `etap` nadpisują pola etapu bazowego.

```json
[
  {
    "typ": "zagadka",
    "anchor": 1,
    "cel": {
      "textId": "quest.old_sign_new_note.runtime.1",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Sprawdź wskazówki i rozwiąż zagadkę."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Check the clues and solve the puzzle."
        }
      ]
    },
    "pytanie": {
      "textId": "quest.old_sign_new_note.runtime.2",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Stary zapis wskazywał 1. Po podłączeniu sieci latarni odczyt wynosi 3. Co się zmieniło?"
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The old record showed 1. After connecting the lantern network, the reading is 3. What changed?"
        }
      ]
    },
    "odpowiedzi": [
      {
        "textId": "quest.old_sign_new_note.runtime.3",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Włączyła się sieć latarni"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "The lantern network came on"
          }
        ]
      },
      {
        "textId": "quest.old_sign_new_note.runtime.4",
        "variants": [
          {
            "language": "pl",
            "localHumor": false,
            "text": "Ktoś ukradł dwa punkty"
          },
          {
            "language": "en",
            "localHumor": false,
            "text": "Someone stole two points"
          }
        ]
      }
    ],
    "dobra": 0,
    "podpowiedz": {
      "textId": "quest.old_sign_new_note.runtime.5",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Porównaj wszystkie podane informacje."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Compare all the information given."
        }
      ]
    }
  },
  {
    "typ": "uklad",
    "anchor": 0,
    "cel": {
      "textId": "quest.old_sign_new_note.v2.goal.484",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Odtwórz mozaikę z notesu."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Reconstruct the notebook mosaic."
        }
      ]
    },
    "tekst": {
      "textId": "quest.old_sign_new_note.v2.instructions.479",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Na ramce: koło zębate po lewej, liść w środku, skrzydło po prawej. Dopasuj fragmenty pojedynczo."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "The frame shows a gear on the left, a leaf in the middle and a wing on the right. Fit the pieces one at a time."
        }
      ]
    },
    "karty": [
      {
        "id": "wing",
        "tekst": {
          "textId": "quest.old_sign_new_note.v2.card.480",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Skrzydło"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Wing"
            }
          ]
        }
      },
      {
        "id": "leaf",
        "tekst": {
          "textId": "quest.old_sign_new_note.v2.card.481",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Liść"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Leaf"
            }
          ]
        }
      },
      {
        "id": "gear",
        "tekst": {
          "textId": "quest.old_sign_new_note.v2.card.482",
          "variants": [
            {
              "language": "pl",
              "localHumor": false,
              "text": "Koło zębate"
            },
            {
              "language": "en",
              "localHumor": false,
              "text": "Gear"
            }
          ]
        }
      }
    ],
    "kolejnosc": [
      "gear",
      "leaf",
      "wing"
    ],
    "podpowiedz": {
      "textId": "quest.old_sign_new_note.v2.hint.483",
      "variants": [
        {
          "language": "pl",
          "localHumor": false,
          "text": "Zacznij od lewej strony ramki."
        },
        {
          "language": "en",
          "localHumor": false,
          "text": "Start at the left side of the frame."
        }
      ]
    }
  }
]
```
