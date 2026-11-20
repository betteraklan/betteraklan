# Tourism workbook review (owner decisions needed)

Workbook SHA-256: `450348e7df619a1bf9421028ff053ea999cdfb73669f721d4f7b6c999b8ee9b8`
Baseline revision: `1322fd5a4e0d5ed45afe1911066e217bfec3eef2`

Edit `src/data/tourism/twin-pairs.json`, then tell the agent to run the live import.

- For each pair set `decision` to `keep-both` (show both), `replace` (the workbook record takes over the site entry, same link) or leave `pending` (the workbook record stays hidden).
- To name an alias the heuristic missed, add a pair with `"source": "owner"`, both IDs and both names exactly as listed below.
- For each held record set `decision` to `publish` or leave `pending`.

## Candidate twin pairs (26)

| Record ID | Workbook name | Site ID | Site name | Score | Decision |
| --- | --- | --- | --- | --- | --- |
| AKL-181 | Jaime L. Sin monument | place-new-washington-2 | THE JAIME L. SIN MONUMENT | 1 | pending |
| AKL-071 | Municipal Ati-Ati / devotional fiesta | event-ibajay-0 | IBAJAY ATI-ATI MUNICIPAL AND DEVOTIONAL FIESTA | 0.8 | pending |
| AKL-211 | St. John Nepomucene Church | place-tangalan-1 | ST. JOHN NEPOMUCENE PARISH CHURCH | 0.8 | pending |
| AKL-033 | Ati-Ati Malakara Festival | event-batan-0 | BATAN ATI-ATI MALAKARA FESTIVAL | 0.75 | pending |
| AKL-034 | Juez de Cuchillo commemoration | event-batan-1 | JUEZ DE CUCHILLO | 0.667 | pending |
| AKL-056 | Hinugtan Beach | place-buruanga-8 | HINUGTAN WHITE BEACH | 0.667 | pending |
| AKL-083 | Aklan Day | event-kalibo-2 | AKLAN DAY CELEBRATION | 0.667 | pending |
| AKL-094 | Freedom Shrine | place-kalibo-0 | AKLAN FREEDOM SHRINE | 0.667 | pending |
| AKL-116 | Kali-Ugyon | event-libacao-1 | KALI-UGYON FESTIVAL | 0.667 | pending |
| AKL-129 | Panipiason Hanging Bridge | place-madalag-1 | HANGING BRIDGE | 0.667 | pending |
| AKL-148 | Dead Forest | place-malay-4 | PRESERVED DEAD FOREST | 0.667 | pending |
| AKL-152 | Nabaoy reforestation area | place-malay-5 | NABAOY REFORESTATION | 0.667 | pending |
| AKL-163 | Pascua sa Malinao | event-malinao-2 | PASCUA SA MALINAO FESTIVAL | 0.667 | pending |
| AKL-180 | Isla Kapispisan sanctuary | place-new-washington-3 | ISLA KAPISPISAN | 0.667 | pending |
| AKL-209 | Mangrove footwalk | place-tangalan-4 | JAWILI MANGROVE FOOTWALK | 0.667 | pending |
| AKL-029 | Aklan State University Main Campus | place-banga-0 | AKLAN STATE UNIVERSITY(ASU) | 0.5 | pending |
| AKL-035 | Angas White Stone (Puting Bato) | place-batan-4 | ANGAS WHITE STONE MOUNTAIN | 0.5 | pending |
| AKL-048 | Spanish-era relics | place-batan-10 | OLD SPANISH RELICS | 0.5 | pending |
| AKL-084 | Ati-Atihan Festival | event-kalibo-0 | KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL | 0.5 | pending |
| AKL-091 | XIX Martyrs commemoration | event-kalibo-1 | XIX MARTYRS OF AKLAN | 0.5 | pending |
| AKL-118 | Aklan River wild-river area | place-libacao-1 | THE WILD RIVER | 0.5 | pending |
| AKL-128 | Liktinon White Rocks | place-madalag-0 | LIKITINON WHITE ROCKS | 0.5 | pending |
| AKL-174 | Tagororoc ecotourism area | place-nabas-2 | TAGOROROC ECOTOURISM DESTINATION | 0.5 | pending |
| AKL-197 | Nahaunang Atis | place-numancia-1 | NAHAUNANG ATIS (FIRST AETAS) | 0.5 | pending |
| AKL-204 | Heroes of Vivo commemoration | event-tangalan-1 | HEROES OF VIVO TANGALAN | 0.5 | pending |
| AKL-004 | Diokno marker | place-altavas-0 | HISTORICAL MARKER OF GENERAL ANANIAS DIOKNO | 0.4 | pending |

## Site entries with no candidate (13): possible aliases

Each is shown next to the NEW workbook records in the same municipality and category.

### event-altavas-0: ALTAVAS STO. NIÑO FESTIVAL (Altavas, Festivals & Events)

- AKL-002: Santo Niño Festival

### place-batan-2: PRISTINE BEACHES OF BARANGAY SONGCOLAN, MANDONG, NAPTI AND MAMBUQUIAO (Batan, Spots & Attractions)

- AKL-041: Mambuquiao Beach
- AKL-042: Mandong Beach
- AKL-043: Napti Beach
- AKL-047: Songcolan Beach

### place-batan-9: CORAL GARDEN (Batan, Spots & Attractions)

- AKL-041: Mambuquiao Beach
- AKL-042: Mandong Beach
- AKL-043: Napti Beach
- AKL-047: Songcolan Beach

### place-buruanga-2: SAINT ANTHONY OF PADUA PARISH CHURCH (Buruanga, Spots & Attractions)

- AKL-053: Ariel’s Point
- AKL-059: Pagbulad sa Bato
- AKL-062: St. Anthony Church

### place-ibajay-0: KATUNGGAN IT IBAJAY (Ibajay, Spots & Attractions)

- AKL-072: Alejandro Melchor birthplace
- AKL-075: Ibajay River
- AKL-076: Katunggan mangrove area
- AKL-077: Snibaa Falls

### place-ibajay-4: IBAJAY RIVERS (Ibajay, Spots & Attractions)

- AKL-072: Alejandro Melchor birthplace
- AKL-075: Ibajay River
- AKL-076: Katunggan mangrove area
- AKL-077: Snibaa Falls

### place-ibajay-5: IBAJAY FALLS (Ibajay, Spots & Attractions)

- AKL-072: Alejandro Melchor birthplace
- AKL-075: Ibajay River
- AKL-076: Katunggan mangrove area
- AKL-077: Snibaa Falls

### event-kalibo-3: AKLAN PIÑA AND FIBER FESTIVAL (Kalibo, Festivals & Events)

- AKL-090: Piña / Fiber events

### place-libacao-2: WATER FALLS (Libacao, Spots & Attractions)

- AKL-119: Manika–Agbatuan trail
- AKL-120: Mt. Nausan and Mt. Nangtud
- AKL-122: Waterfalls of Libacao

### place-libacao-3: INLAND ADVENTURE TREK (Libacao, Spots & Attractions)

- AKL-119: Manika–Agbatuan trail
- AKL-120: Mt. Nausan and Mt. Nangtud
- AKL-122: Waterfalls of Libacao

### place-libacao-4: MOUNTAINEERING (Libacao, Spots & Attractions)

- AKL-119: Manika–Agbatuan trail
- AKL-120: Mt. Nausan and Mt. Nangtud
- AKL-122: Waterfalls of Libacao

### place-numancia-2: CLUSTERED CENTURY-OLD ACACIA TREES (Numancia, Spots & Attractions)

- AKL-195: Albasan Elementary School acacia trees
- AKL-196: Camanci Beach
- AKL-198: Navitas Beach

### place-tangalan-6: MARINE SANCTUARY AND CORAL GARDEN (Tangalan, Spots & Attractions)

- AKL-210: Pungtod Reef marine sanctuary

## Held records (4)

- AKL-003: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy (decision: publish)
- AKL-005: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy (decision: publish)
- AKL-007: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy (decision: publish)
- AKL-008: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy (decision: publish)
