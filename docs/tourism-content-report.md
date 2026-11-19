# Tourism workbook integration report

Generated from `src/data/tourism/workbook-reconciliation.json`. Every workbook record appears below by `Record ID`.

## Inputs

- Workbook used: `C:\Users\Lance\Downloads\Aklan_Image_Sources_Google_Images_Update_22.xlsx`. The path named in `AGENTS - Aklan Tourism.md` (`outputs/aklan-image-update-22/...`) does not exist on this machine, so the owner's same-named copy was used.
- Workbook SHA-256: `450348e7df619a1bf9421028ff053ea999cdfb73669f721d4f7b6c999b8ee9b8`. **Owner: please confirm this is the approved file.**
- Baseline (pre-import `municipalities.json`): git revision `6d1f30ead5c59002e1af9852ffcaa51ce24c97e1`.
- Owner decisions: all 26 candidate pairs and all 4 held records left `pending` (confirmed in chat).
- Pins: approximate municipality-centre pins (A7) on; `--no-pins` not used.

## Section 3 facts, recomputed

| Fact | Prompt | Measured | Difference |
| --- | --- | --- | --- |
| Records | 205 | 205 | none |
| Blank rows | 207–213 | 207, 208, 209, 210, 211, 212, 213 | none |
| ID gaps | 22, 37, 39, 99, 100, 131, 139 | 22, 37, 39, 99, 100, 131, 139 | none |
| Description | 17 | 17 | none |
| Festivals & Events | 34 | 34 | none |
| Spots & Attractions | 101 | 101 | none |
| Products & Local Delicacies | 53 | 53 | none |
| Blank Location/barangay | 17 | 17 | none |
| Exact / workbook-only / site-only | 71 / 117 / 39 | 71 / 117 / 39 | none |
| Candidate pairs | 26 | 26 | none |
| Unmatched site entries | 13 | 13 | none |
| Licence classes (explicit / see source / not stated / other) | 10 / 41 / 124 / 30 | 10 / 41 / 124 / 30 | none |
| NEW records appended | 91 | 87 | 4 fewer: AKL-003, 005, 007, 008 are held (identical description) |
| Names `toTitleCase` would re-case | 75 of 188 | 75 of 188 | none |

Correction to the prompt: section 10 said `npx tsc -p tsconfig.app.json --noEmit` reports 48 pre-existing errors in four files. It reports 312 error lines across many files, identical before and after this work (3 are in tourism files and predate it). This work adds none.

## EXACT matches updated in place (71)

Name and description now equal the workbook. "Explore" shows the stored name; the municipality page used to re-case it.

| Record ID | Site ID | Old name | New name | Explore name changes | Municipality page name changes |
| --- | --- | --- | --- | --- | --- |
| AKL-009 | place-altavas-1 | TINAGONG DAGAT | Tinagong Dagat | yes | no |
| AKL-015 | event-balete-0 | ENCHANTING BALETE | Enchanting Balete | yes | no |
| AKL-016 | event-balete-1 | KULTURA BALETE | Kultura Balete | yes | no |
| AKL-017 | place-balete-0 | AGTAWAGON HILL | Agtawagon Hill | yes | no |
| AKL-018 | place-balete-1 | BASURA GARDEN | Basura Garden | yes | no |
| AKL-019 | place-balete-2 | KABUHI-AN CENTER | Kabuhi-an Center | yes | no |
| AKL-027 | event-banga-1 | PAG AEAW-AEAW | Pag-Aeaw-Aeaw | yes | yes |
| AKL-028 | event-banga-0 | SAGUIBIN FESTIVAL | Saguibin Festival | yes | no |
| AKL-030 | place-banga-1 | MANDUYOG HILL | Manduyog Hill | yes | no |
| AKL-036 | place-batan-7 | BATAN SEA PORT | Batan Sea Port | yes | no |
| AKL-038 | place-batan-3 | CAMANCI FALLS | Camanci Falls | yes | no |
| AKL-040 | place-batan-0 | KALANTIAW SHRINE | Kalantiaw Shrine | yes | no |
| AKL-044 | place-batan-1 | OB-OB HILL | Ob-Ob Hill | yes | yes |
| AKL-045 | place-batan-5 | PANDAN HILLS | Pandan Hills | yes | no |
| AKL-046 | place-batan-8 | SAN LORENZO RUIZ DE MANILA PARISH CHURCH | San Lorenzo Ruiz de Manila Parish Church | yes | yes |
| AKL-052 | event-buruanga-0 | PANAGAT FESTIVAL | Panagat Festival | yes | no |
| AKL-054 | place-buruanga-1 | ASHRAM BALAY PAGDUAW | Ashram Balay Pagduaw | yes | no |
| AKL-055 | place-buruanga-11 | HACIENDA MARIA | Hacienda Maria | yes | no |
| AKL-057 | place-buruanga-0 | INGUS-INGUS HILL | Ingus-Ingus Hill | yes | yes |
| AKL-058 | place-buruanga-10 | PAGATPAT MANGROVE | Pagatpat Mangrove | yes | no |
| AKL-060 | place-buruanga-4 | SABANG CAVE | Sabang Cave | yes | no |
| AKL-061 | place-buruanga-5 | SAPSAPON CAVE | Sapsapon Cave | yes | no |
| AKL-063 | place-buruanga-7 | TALISAY BEACH | Talisay Beach | yes | no |
| AKL-064 | place-buruanga-6 | TIGIS FALLS | Tigis Falls | yes | no |
| AKL-065 | place-buruanga-9 | TUBURAN BAYBAY | Tuburan Baybay | yes | no |
| AKL-073 | place-ibajay-1 | CAMPO VERDE | Campo Verde | yes | no |
| AKL-074 | place-ibajay-3 | IBAJAY BEACH | Ibajay Beach | yes | no |
| AKL-085 | event-kalibo-6 | FEAST OF ST. JOHN THE BAPTIST | Feast of St. John the Baptist | yes | no |
| AKL-086 | event-kalibo-5 | HIGANTE CONTEST | Higante contest | yes | yes |
| AKL-087 | event-kalibo-8 | IWAG IT KALIBONHON | Iwag it Kalibonhon | yes | yes |
| AKL-088 | event-kalibo-7 | KALIBO DAY | Kalibo Day | yes | no |
| AKL-089 | event-kalibo-4 | KALIBO FOOD FESTIVAL | Kalibo Food Festival | yes | no |
| AKL-092 | place-kalibo-4 | ATI-ATIHAN VILLAGE | Ati-Atihan Village | yes | yes |
| AKL-093 | place-kalibo-6 | BAKHAWAN ECO-PARK | Bakhawan Eco-Park | yes | yes |
| AKL-095 | place-kalibo-5 | KALIBO CATHEDRAL | Kalibo Cathedral | yes | no |
| AKL-096 | place-kalibo-2 | MUSEO IT AKEAN | Museo it Akean | yes | yes |
| AKL-097 | place-kalibo-3 | PIÑA VILLAGE | Piña Village | yes | no |
| AKL-098 | place-kalibo-1 | TIGAYON HILL & CAVES | Tigayon Hill and caves | yes | yes |
| AKL-107 | event-lezo-0 | BAYANGAN FESTIVAL | Bayangan Festival | yes | no |
| AKL-115 | event-libacao-0 | BAESA PARADA | Baesa Parada | yes | no |
| AKL-121 | place-libacao-0 | TAROYTOY | Taroytoy | yes | no |
| AKL-126 | event-madalag-0 | TINUOM FESTIVAL | Tinuom Festival | yes | no |
| AKL-127 | place-madalag-2 | AGTUGHANGIN FALLS | Agtughangin Falls | yes | no |
| AKL-135 | place-makato-0 | AKLAN SPORTS COMPLEX | Aklan Sports Complex | yes | no |
| AKL-142 | event-malay-1 | FIESTA DE OBREROS | Fiesta de Obreros | yes | yes |
| AKL-143 | event-malay-0 | MALAY DAY | Malay Day | yes | no |
| AKL-144 | place-malay-6 | AGNAGA MINI FALLS AND COLD SPRING | Agnaga mini falls and cold spring | yes | yes |
| AKL-145 | place-malay-3 | BAT CAVES | Bat Caves | yes | no |
| AKL-146 | place-malay-0 | BORACAY ISLAND | Boracay Island | yes | no |
| AKL-149 | place-malay-2 | MALAY ECOLOGICAL PARK | Malay Ecological Park | yes | no |
| AKL-150 | place-malay-9 | MOTAG LIVING MUSEUM | Motag Living Museum | yes | no |
| AKL-151 | place-malay-8 | NAASUG POINT | Naasug Point | yes | no |
| AKL-154 | place-malay-7 | NAGATA FALLS | Nagata Falls | yes | no |
| AKL-155 | place-malay-1 | PANGIHAN CAVE | Pangihan Cave | yes | no |
| AKL-161 | event-malinao-1 | EL LEVANTAMIENTO DELOS OCHENTA Y DOS DE LILOAN | El Levantamiento de los Ochenta y Dos de Liloan | yes | yes |
| AKL-164 | place-malinao-0 | CANDIDO IBAN MONUMENT | Candido Iban Monument | yes | no |
| AKL-165 | place-malinao-1 | FATIMA HILL | Fatima Hill | yes | no |
| AKL-166 | place-malinao-2 | MANOMONG FALLS | Manomong Falls | yes | no |
| AKL-171 | event-nabas-0 | BARIW FESTIVAL | Bariw Festival | yes | no |
| AKL-172 | place-nabas-1 | BASANG CAVE | Basang Cave | yes | no |
| AKL-173 | place-nabas-0 | LASERNA COLD SPRINGS | Laserna cold springs | yes | yes |
| AKL-182 | place-new-washington-4 | LAGATIK RIVER CRUISE | Lagatik River cruise | yes | yes |
| AKL-183 | place-new-washington-1 | PINK SISTERS CONVENT | Pink Sisters Convent | yes | no |
| AKL-184 | place-new-washington-0 | TAMBAK SEA WALL | Tambak seawall | yes | yes |
| AKL-194 | event-numancia-0 | LECHON PARADE | Lechon Parade | yes | no |
| AKL-199 | place-numancia-0 | VERMI-COMPOSTING FARMS | Vermicomposting farms | yes | yes |
| AKL-203 | event-tangalan-0 | BUGNA FESTIVAL | Bugna Festival | yes | no |
| AKL-205 | place-tangalan-0 | AFGA WAVE ROCK FORMATION | Afga Wave Rock Formation | yes | no |
| AKL-206 | place-tangalan-5 | CAMPO VERDE | Campo Verde | yes | no |
| AKL-207 | place-tangalan-3 | JAWILI BEACH | Jawili Beach | yes | no |
| AKL-208 | place-tangalan-2 | JAWILI FALLS | Jawili Falls | yes | no |

Changed display names: 71 in Explore, 17 on municipality pages.

## NEW records appended (87)

| Record ID | Municipality | Category | Item name | New id |
| --- | --- | --- | --- | --- |
| AKL-002 | Altavas | Festivals & Events | Santo Niño Festival | event-altavas-1 |
| AKL-006 | Altavas | Spots & Attractions | Macawiwili Falls | place-altavas-3 |
| AKL-010 | Altavas | Products & Local Delicacies | Nito bags | product-altavas-1 |
| AKL-011 | Altavas | Products & Local Delicacies | Puto Seko | product-altavas-2 |
| AKL-012 | Altavas | Products & Local Delicacies | Puto Tostado | product-altavas-3 |
| AKL-013 | Altavas | Products & Local Delicacies | Virgin coconut oil | product-altavas-4 |
| AKL-020 | Balete | Products & Local Delicacies | Limbok | product-balete-1 |
| AKL-021 | Balete | Products & Local Delicacies | Nito crafts | product-balete-2 |
| AKL-023 | Balete | Products & Local Delicacies | Piña cloth | product-balete-3 |
| AKL-024 | Balete | Products & Local Delicacies | Pinipig | product-balete-4 |
| AKL-025 | Balete | Products & Local Delicacies | Rambutan | product-balete-5 |
| AKL-031 | Banga | Products & Local Delicacies | Calamansi | product-banga-0 |
| AKL-041 | Batan | Spots & Attractions | Mambuquiao Beach | place-batan-11 |
| AKL-042 | Batan | Spots & Attractions | Mandong Beach | place-batan-12 |
| AKL-043 | Batan | Spots & Attractions | Napti Beach | place-batan-13 |
| AKL-047 | Batan | Spots & Attractions | Songcolan Beach | place-batan-14 |
| AKL-049 | Batan | Products & Local Delicacies | Puto buko | product-batan-1 |
| AKL-050 | Batan | Products & Local Delicacies | Puto cheese | product-batan-2 |
| AKL-053 | Buruanga | Spots & Attractions | Ariel’s Point | place-buruanga-12 |
| AKL-059 | Buruanga | Spots & Attractions | Pagbulad sa Bato | place-buruanga-13 |
| AKL-062 | Buruanga | Spots & Attractions | St. Anthony Church | place-buruanga-14 |
| AKL-066 | Buruanga | Products & Local Delicacies | Bukarilyo | product-buruanga-0 |
| AKL-067 | Buruanga | Products & Local Delicacies | Buri bags | product-buruanga-1 |
| AKL-068 | Buruanga | Products & Local Delicacies | Fresh fish and seafood | product-buruanga-2 |
| AKL-069 | Buruanga | Products & Local Delicacies | Puto | product-buruanga-3 |
| AKL-072 | Ibajay | Spots & Attractions | Alejandro Melchor birthplace | place-ibajay-6 |
| AKL-075 | Ibajay | Spots & Attractions | Ibajay River | place-ibajay-7 |
| AKL-076 | Ibajay | Spots & Attractions | Katunggan mangrove area | place-ibajay-8 |
| AKL-077 | Ibajay | Spots & Attractions | Snibaa Falls | place-ibajay-9 |
| AKL-078 | Ibajay | Products & Local Delicacies | Coloncolong pottery | product-ibajay-1 |
| AKL-079 | Ibajay | Products & Local Delicacies | Linumak | product-ibajay-2 |
| AKL-080 | Ibajay | Products & Local Delicacies | Nito crafts | product-ibajay-3 |
| AKL-081 | Ibajay | Products & Local Delicacies | Pulvoron | product-ibajay-4 |
| AKL-090 | Kalibo | Festivals & Events | Piña / Fiber events | event-kalibo-9 |
| AKL-101 | Kalibo | Products & Local Delicacies | Kalibo longganisa | product-kalibo-3 |
| AKL-102 | Kalibo | Products & Local Delicacies | Piña textiles | product-kalibo-4 |
| AKL-103 | Kalibo | Products & Local Delicacies | Processed meats | product-kalibo-5 |
| AKL-104 | Kalibo | Products & Local Delicacies | Tamilok | product-kalibo-6 |
| AKL-105 | Kalibo | Products & Local Delicacies | Tinuom na tamilok | product-kalibo-7 |
| AKL-108 | Lezo | Spots & Attractions | Church and bell tower | place-lezo-1 |
| AKL-109 | Lezo | Spots & Attractions | Lezo Plaza | place-lezo-2 |
| AKL-110 | Lezo | Spots & Attractions | Pottery workshops | place-lezo-3 |
| AKL-111 | Lezo | Products & Local Delicacies | Ampaw | product-lezo-1 |
| AKL-112 | Lezo | Products & Local Delicacies | Earthen pots and jars | product-lezo-2 |
| AKL-113 | Lezo | Products & Local Delicacies | Inumoe | product-lezo-3 |
| AKL-117 | Libacao | Festivals & Events | Kiyaw-kiyaw | event-libacao-2 |
| AKL-119 | Libacao | Spots & Attractions | Manika–Agbatuan trail | place-libacao-6 |
| AKL-120 | Libacao | Spots & Attractions | Mt. Nausan and Mt. Nangtud | place-libacao-7 |
| AKL-122 | Libacao | Spots & Attractions | Waterfalls of Libacao | place-libacao-8 |
| AKL-123 | Libacao | Products & Local Delicacies | Abaca fiber and handicrafts | product-libacao-1 |
| AKL-124 | Libacao | Products & Local Delicacies | Local agricultural produce | product-libacao-2 |
| AKL-130 | Madalag | Products & Local Delicacies | Chicharon | product-madalag-1 |
| AKL-132 | Madalag | Products & Local Delicacies | Tinuom | product-madalag-2 |
| AKL-134 | Makato | Festivals & Events | Sto. Niño Ati-atihan | event-makato-1 |
| AKL-136 | Makato | Spots & Attractions | Aklan State University Makato Annex | place-makato-3 |
| AKL-137 | Makato | Spots & Attractions | Baybay Beach | place-makato-4 |
| AKL-138 | Makato | Spots & Attractions | Salimuno Falls | place-makato-5 |
| AKL-140 | Makato | Products & Local Delicacies | Nito weaving | product-makato-1 |
| AKL-147 | Malay | Spots & Attractions | Boracay Wetland Conservation Park (Wetland 2) | place-malay-10 |
| AKL-153 | Malay | Spots & Attractions | Nabaoy River | place-malay-11 |
| AKL-156 | Malay | Spots & Attractions | White Beach | place-malay-12 |
| AKL-157 | Malay | Products & Local Delicacies | Calamansi muffins | product-malay-1 |
| AKL-158 | Malay | Products & Local Delicacies | Chori burger | product-malay-2 |
| AKL-159 | Malay | Products & Local Delicacies | Panagon freshwater catch | product-malay-3 |
| AKL-162 | Malinao | Festivals & Events | Malinao Ati-atihan | event-malinao-3 |
| AKL-167 | Malinao | Products & Local Delicacies | Abaca bags, sandals and wallets | product-malinao-1 |
| AKL-168 | Malinao | Products & Local Delicacies | Nigo baskets | product-malinao-2 |
| AKL-169 | Malinao | Products & Local Delicacies | Sarok hats | product-malinao-3 |
| AKL-175 | Nabas | Products & Local Delicacies | Bariw bags | product-nabas-1 |
| AKL-176 | Nabas | Products & Local Delicacies | Bariw hats | product-nabas-2 |
| AKL-177 | Nabas | Products & Local Delicacies | Bariw mats and purses | product-nabas-3 |
| AKL-179 | New Washington | Festivals & Events | Pacto de Sangre commemoration | event-new-washington-1 |
| AKL-185 | New Washington | Products & Local Delicacies | Amboeong | product-new-washington-3 |
| AKL-186 | New Washington | Products & Local Delicacies | Crabs and prawns | product-new-washington-4 |
| AKL-187 | New Washington | Products & Local Delicacies | Hale-hale | product-new-washington-5 |
| AKL-188 | New Washington | Products & Local Delicacies | Ibos | product-new-washington-6 |
| AKL-189 | New Washington | Products & Local Delicacies | Sasing | product-new-washington-7 |
| AKL-190 | New Washington | Products & Local Delicacies | Suman | product-new-washington-8 |
| AKL-191 | New Washington | Products & Local Delicacies | Tamiluk | product-new-washington-9 |
| AKL-192 | New Washington | Products & Local Delicacies | Tuba | product-new-washington-10 |
| AKL-195 | Numancia | Spots & Attractions | Albasan Elementary School acacia trees | place-numancia-4 |
| AKL-196 | Numancia | Spots & Attractions | Camanci Beach | place-numancia-5 |
| AKL-198 | Numancia | Spots & Attractions | Navitas Beach | place-numancia-6 |
| AKL-200 | Numancia | Products & Local Delicacies | Bulwang pork liempo | product-numancia-1 |
| AKL-201 | Numancia | Products & Local Delicacies | Lechon | product-numancia-2 |
| AKL-210 | Tangalan | Spots & Attractions | Pungtod Reef marine sanctuary | place-tangalan-7 |
| AKL-212 | Tangalan | Products & Local Delicacies | Fresh seafood | product-tangalan-1 |

## Candidate twins withheld (26, all pending)

The site entry stays; the workbook record is kept only in the reconciliation file.

| Record ID | Workbook name | Site ID | Site name | Score |
| --- | --- | --- | --- | --- |
| AKL-181 | Jaime L. Sin monument | place-new-washington-2 | THE JAIME L. SIN MONUMENT | 1 |
| AKL-071 | Municipal Ati-Ati / devotional fiesta | event-ibajay-0 | IBAJAY ATI-ATI MUNICIPAL AND DEVOTIONAL FIESTA | 0.8 |
| AKL-211 | St. John Nepomucene Church | place-tangalan-1 | ST. JOHN NEPOMUCENE PARISH CHURCH | 0.8 |
| AKL-033 | Ati-Ati Malakara Festival | event-batan-0 | BATAN ATI-ATI MALAKARA FESTIVAL | 0.75 |
| AKL-034 | Juez de Cuchillo commemoration | event-batan-1 | JUEZ DE CUCHILLO | 0.667 |
| AKL-056 | Hinugtan Beach | place-buruanga-8 | HINUGTAN WHITE BEACH | 0.667 |
| AKL-083 | Aklan Day | event-kalibo-2 | AKLAN DAY CELEBRATION | 0.667 |
| AKL-094 | Freedom Shrine | place-kalibo-0 | AKLAN FREEDOM SHRINE | 0.667 |
| AKL-116 | Kali-Ugyon | event-libacao-1 | KALI-UGYON FESTIVAL | 0.667 |
| AKL-129 | Panipiason Hanging Bridge | place-madalag-1 | HANGING BRIDGE | 0.667 |
| AKL-148 | Dead Forest | place-malay-4 | PRESERVED DEAD FOREST | 0.667 |
| AKL-152 | Nabaoy reforestation area | place-malay-5 | NABAOY REFORESTATION | 0.667 |
| AKL-163 | Pascua sa Malinao | event-malinao-2 | PASCUA SA MALINAO FESTIVAL | 0.667 |
| AKL-180 | Isla Kapispisan sanctuary | place-new-washington-3 | ISLA KAPISPISAN | 0.667 |
| AKL-209 | Mangrove footwalk | place-tangalan-4 | JAWILI MANGROVE FOOTWALK | 0.667 |
| AKL-029 | Aklan State University Main Campus | place-banga-0 | AKLAN STATE UNIVERSITY(ASU) | 0.5 |
| AKL-035 | Angas White Stone (Puting Bato) | place-batan-4 | ANGAS WHITE STONE MOUNTAIN | 0.5 |
| AKL-048 | Spanish-era relics | place-batan-10 | OLD SPANISH RELICS | 0.5 |
| AKL-084 | Ati-Atihan Festival | event-kalibo-0 | KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL | 0.5 |
| AKL-091 | XIX Martyrs commemoration | event-kalibo-1 | XIX MARTYRS OF AKLAN | 0.5 |
| AKL-118 | Aklan River wild-river area | place-libacao-1 | THE WILD RIVER | 0.5 |
| AKL-128 | Liktinon White Rocks | place-madalag-0 | LIKITINON WHITE ROCKS | 0.5 |
| AKL-174 | Tagororoc ecotourism area | place-nabas-2 | TAGOROROC ECOTOURISM DESTINATION | 0.5 |
| AKL-197 | Nahaunang Atis | place-numancia-1 | NAHAUNANG ATIS (FIRST AETAS) | 0.5 |
| AKL-204 | Heroes of Vivo commemoration | event-tangalan-1 | HEROES OF VIVO TANGALAN | 0.5 |
| AKL-004 | Diokno marker | place-altavas-0 | HISTORICAL MARKER OF GENERAL ANANIAS DIOKNO | 0.4 |

AKL-004 / Diokno marker qualifies by containment only (score 0.4).

## Site-only entries, retained pending owner review (39)

- place-altavas-0: HISTORICAL MARKER OF GENERAL ANANIAS DIOKNO (candidate twin of AKL-004)
- event-altavas-0: ALTAVAS STO. NIÑO FESTIVAL (**no candidate**)
- place-banga-0: AKLAN STATE UNIVERSITY(ASU) (candidate twin of AKL-029)
- place-batan-2: PRISTINE BEACHES OF BARANGAY SONGCOLAN, MANDONG, NAPTI AND MAMBUQUIAO (**no candidate**)
- place-batan-4: ANGAS WHITE STONE MOUNTAIN (candidate twin of AKL-035)
- place-batan-9: CORAL GARDEN (**no candidate**)
- place-batan-10: OLD SPANISH RELICS (candidate twin of AKL-048)
- event-batan-0: BATAN ATI-ATI MALAKARA FESTIVAL (candidate twin of AKL-033)
- event-batan-1: JUEZ DE CUCHILLO (candidate twin of AKL-034)
- place-buruanga-2: SAINT ANTHONY OF PADUA PARISH CHURCH (**no candidate**)
- place-buruanga-8: HINUGTAN WHITE BEACH (candidate twin of AKL-056)
- place-ibajay-0: KATUNGGAN IT IBAJAY (**no candidate**)
- place-ibajay-4: IBAJAY RIVERS (**no candidate**)
- place-ibajay-5: IBAJAY FALLS (**no candidate**)
- event-ibajay-0: IBAJAY ATI-ATI MUNICIPAL AND DEVOTIONAL FIESTA (candidate twin of AKL-071)
- place-kalibo-0: AKLAN FREEDOM SHRINE (candidate twin of AKL-094)
- event-kalibo-0: KALIBO STO. NIÑO ATI-ATIHAN FESTIVAL (candidate twin of AKL-084)
- event-kalibo-1: XIX MARTYRS OF AKLAN (candidate twin of AKL-091)
- event-kalibo-2: AKLAN DAY CELEBRATION (candidate twin of AKL-083)
- event-kalibo-3: AKLAN PIÑA AND FIBER FESTIVAL (**no candidate**)
- place-libacao-1: THE WILD RIVER (candidate twin of AKL-118)
- place-libacao-2: WATER FALLS (**no candidate**)
- place-libacao-3: INLAND ADVENTURE TREK (**no candidate**)
- place-libacao-4: MOUNTAINEERING (**no candidate**)
- event-libacao-1: KALI-UGYON FESTIVAL (candidate twin of AKL-116)
- place-madalag-0: LIKITINON WHITE ROCKS (candidate twin of AKL-128)
- place-madalag-1: HANGING BRIDGE (candidate twin of AKL-129)
- place-malay-4: PRESERVED DEAD FOREST (candidate twin of AKL-148)
- place-malay-5: NABAOY REFORESTATION (candidate twin of AKL-152)
- event-malinao-2: PASCUA SA MALINAO FESTIVAL (candidate twin of AKL-163)
- place-nabas-2: TAGOROROC ECOTOURISM DESTINATION (candidate twin of AKL-174)
- place-new-washington-2: THE JAIME L. SIN MONUMENT (candidate twin of AKL-181)
- place-new-washington-3: ISLA KAPISPISAN (candidate twin of AKL-180)
- place-numancia-1: NAHAUNANG ATIS (FIRST AETAS) (candidate twin of AKL-197)
- place-numancia-2: CLUSTERED CENTURY-OLD ACACIA TREES (**no candidate**)
- place-tangalan-1: ST. JOHN NEPOMUCENE PARISH CHURCH (candidate twin of AKL-211)
- place-tangalan-4: JAWILI MANGROVE FOOTWALK (candidate twin of AKL-209)
- place-tangalan-6: MARINE SANCTUARY AND CORAL GARDEN (**no candidate**)
- event-tangalan-1: HEROES OF VIVO TANGALAN (candidate twin of AKL-204)

### The 13 unmatched site entries, with possible aliases

NEW workbook records in the same municipality and category, for alias review (the heuristic misses aliases such as AKL-002 Santo Niño Festival):

- event-altavas-0 ALTAVAS STO. NIÑO FESTIVAL: AKL-002 Santo Niño Festival
- place-batan-2 PRISTINE BEACHES OF BARANGAY SONGCOLAN, MANDONG, NAPTI AND MAMBUQUIAO: AKL-041 Mambuquiao Beach; AKL-042 Mandong Beach; AKL-043 Napti Beach; AKL-047 Songcolan Beach
- place-batan-9 CORAL GARDEN: AKL-041 Mambuquiao Beach; AKL-042 Mandong Beach; AKL-043 Napti Beach; AKL-047 Songcolan Beach
- place-buruanga-2 SAINT ANTHONY OF PADUA PARISH CHURCH: AKL-053 Ariel’s Point; AKL-059 Pagbulad sa Bato; AKL-062 St. Anthony Church
- place-ibajay-0 KATUNGGAN IT IBAJAY: AKL-072 Alejandro Melchor birthplace; AKL-075 Ibajay River; AKL-076 Katunggan mangrove area; AKL-077 Snibaa Falls
- place-ibajay-4 IBAJAY RIVERS: AKL-072 Alejandro Melchor birthplace; AKL-075 Ibajay River; AKL-076 Katunggan mangrove area; AKL-077 Snibaa Falls
- place-ibajay-5 IBAJAY FALLS: AKL-072 Alejandro Melchor birthplace; AKL-075 Ibajay River; AKL-076 Katunggan mangrove area; AKL-077 Snibaa Falls
- event-kalibo-3 AKLAN PIÑA AND FIBER FESTIVAL: AKL-090 Piña / Fiber events
- place-libacao-2 WATER FALLS: AKL-119 Manika–Agbatuan trail; AKL-120 Mt. Nausan and Mt. Nangtud; AKL-122 Waterfalls of Libacao
- place-libacao-3 INLAND ADVENTURE TREK: AKL-119 Manika–Agbatuan trail; AKL-120 Mt. Nausan and Mt. Nangtud; AKL-122 Waterfalls of Libacao
- place-libacao-4 MOUNTAINEERING: AKL-119 Manika–Agbatuan trail; AKL-120 Mt. Nausan and Mt. Nangtud; AKL-122 Waterfalls of Libacao
- place-numancia-2 CLUSTERED CENTURY-OLD ACACIA TREES: AKL-195 Albasan Elementary School acacia trees; AKL-196 Camanci Beach; AKL-198 Navitas Beach
- place-tangalan-6 MARINE SANCTUARY AND CORAL GARDEN: AKL-210 Pungtod Reef marine sanctuary

## Held records (doubtful copy)

- AKL-003: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy Not published.
- AKL-005: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy Not published.
- AKL-007: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy Not published.
- AKL-008: Identical Content Description shared by AKL-003, AKL-005, AKL-007, AKL-008: doubtful copy Not published.

## Blank rows, ID gaps, blank locations

- Blank rows (both tabs): sheet rows 207, 208, 209, 210, 211, 212, 213.
- ID gaps: AKL-022, AKL-037, AKL-039, AKL-099, AKL-100, AKL-131, AKL-139.
- Blank Location/barangay (all municipality overviews): AKL-001, AKL-014, AKL-026, AKL-032, AKL-051, AKL-070, AKL-082, AKL-106, AKL-114, AKL-125, AKL-133, AKL-141, AKL-160, AKL-170, AKL-178, AKL-193, AKL-202.

## Images

**Published: none.** Passing rules 1 to 5: AKL-001, AKL-004. AKL-001 is an overview (no photo slot); AKL-004 is a withheld candidate twin. AKL-026 passes the mechanical rules but is held for a human subject decision. No file was downloaded; `public/tourism/` does not exist and `tourism-images.json` is empty.

- Held URL recorded (retired link, not used): AKL-003, AKL-008, AKL-013, AKL-014, AKL-015, AKL-016, AKL-017, AKL-018, AKL-019, AKL-025, AKL-026, AKL-031, AKL-035, AKL-038, AKL-041, AKL-042, AKL-043, AKL-044, AKL-045, AKL-047, AKL-048, AKL-049, AKL-050, AKL-051, AKL-052, AKL-054, AKL-060, AKL-065, AKL-078, AKL-082, AKL-085, AKL-086, AKL-090, AKL-092, AKL-093, AKL-094, AKL-105, AKL-106, AKL-111, AKL-130, AKL-132, AKL-135, AKL-146, AKL-157, AKL-167, AKL-178, AKL-185, AKL-189, AKL-195, AKL-212.
- PARTIAL / NAME-ONLY / illustrative / generic: AKL-011, AKL-049, AKL-050, AKL-130, AKL-136, AKL-185, AKL-189, AKL-190, AKL-197, AKL-199.
- Not a direct image (page, search result, PDF, or no direct-image evidence): AKL-003, AKL-005, AKL-008, AKL-011, AKL-013, AKL-016, AKL-020, AKL-024, AKL-025, AKL-027, AKL-029, AKL-030, AKL-033, AKL-034, AKL-038, AKL-040, AKL-042, AKL-047, AKL-048, AKL-049, AKL-053, AKL-055, AKL-056, AKL-058, AKL-060, AKL-063, AKL-064, AKL-066, AKL-067, AKL-068, AKL-069, AKL-071, AKL-072, AKL-076, AKL-078, AKL-079, AKL-081, AKL-084, AKL-087, AKL-095, AKL-096, AKL-097, AKL-098, AKL-101, AKL-102, AKL-107, AKL-108, AKL-110, AKL-111, AKL-114, AKL-115, AKL-116, AKL-118, AKL-119, AKL-121, AKL-126, AKL-128, AKL-132, AKL-133, AKL-134, AKL-136, AKL-137, AKL-138, AKL-140, AKL-143, AKL-144, AKL-145, AKL-150, AKL-151, AKL-153, AKL-155, AKL-156, AKL-158, AKL-159, AKL-160, AKL-161, AKL-162, AKL-163, AKL-164, AKL-167, AKL-170, AKL-171, AKL-172, AKL-173, AKL-174, AKL-176, AKL-177, AKL-179, AKL-181, AKL-183, AKL-186, AKL-187, AKL-188, AKL-189, AKL-190, AKL-191, AKL-192, AKL-193, AKL-196, AKL-197, AKL-199, AKL-200, AKL-201, AKL-202, AKL-203, AKL-204, AKL-205, AKL-207, AKL-208, AKL-211.
- Signed or expiring links: AKL-009, AKL-010, AKL-046, AKL-062, AKL-168, AKL-182, AKL-194.
- Licence not stated: AKL-003, AKL-005, AKL-008, AKL-009, AKL-010, AKL-013, AKL-015, AKL-017, AKL-018, AKL-019, AKL-020, AKL-025, AKL-027, AKL-029, AKL-030, AKL-031, AKL-033, AKL-034, AKL-035, AKL-040, AKL-041, AKL-043, AKL-044, AKL-046, AKL-047, AKL-048, AKL-052, AKL-053, AKL-054, AKL-055, AKL-056, AKL-058, AKL-060, AKL-063, AKL-064, AKL-065, AKL-066, AKL-067, AKL-069, AKL-071, AKL-073, AKL-076, AKL-078, AKL-084, AKL-086, AKL-087, AKL-090, AKL-092, AKL-093, AKL-094, AKL-095, AKL-096, AKL-097, AKL-098, AKL-101, AKL-102, AKL-105, AKL-106, AKL-107, AKL-108, AKL-110, AKL-111, AKL-114, AKL-115, AKL-116, AKL-118, AKL-119, AKL-121, AKL-124, AKL-126, AKL-128, AKL-130, AKL-133, AKL-134, AKL-135, AKL-137, AKL-138, AKL-140, AKL-143, AKL-145, AKL-148, AKL-150, AKL-151, AKL-153, AKL-155, AKL-156, AKL-157, AKL-158, AKL-159, AKL-160, AKL-161, AKL-162, AKL-163, AKL-164, AKL-167, AKL-168, AKL-170, AKL-171, AKL-172, AKL-173, AKL-174, AKL-176, AKL-177, AKL-181, AKL-182, AKL-183, AKL-185, AKL-186, AKL-188, AKL-191, AKL-192, AKL-193, AKL-194, AKL-200, AKL-201, AKL-202, AKL-203, AKL-204, AKL-205, AKL-206, AKL-207, AKL-208, AKL-209, AKL-211.
- "See source for credit and reuse terms": AKL-002, AKL-007, AKL-012, AKL-021, AKL-023, AKL-028, AKL-032, AKL-057, AKL-059, AKL-061, AKL-070, AKL-074, AKL-075, AKL-077, AKL-080, AKL-083, AKL-089, AKL-103, AKL-104, AKL-109, AKL-112, AKL-113, AKL-117, AKL-122, AKL-123, AKL-125, AKL-127, AKL-129, AKL-141, AKL-142, AKL-147, AKL-149, AKL-152, AKL-154, AKL-165, AKL-169, AKL-175, AKL-180, AKL-184, AKL-198, AKL-210.
- Creative Commons, held because the credit strip truncates and cannot link: AKL-036, AKL-045, AKL-050, AKL-051, AKL-082, AKL-178, AKL-195.
- Images stored with no slot: none stored. Overviews with a passing or held image: AKL-001, AKL-026.

### The 30 unclear licence notes

- AKL-006: "Gerald Inocencio (geraldski), Flickr; licensing terms not verified."
- AKL-011: "About Filipino Food (aboutfilipinofood.com). Reuse terms not verified; page link only."
- AKL-014: "Photo credit and license are listed on the Wikimedia Commons file page; follow its attribution and reuse terms."
- AKL-016: "By the Jal-o River blog (a-river-called-jal-o.blogspot.com). Reuse terms not verified; page link only."
- AKL-024: "Tumblr post by iamdarwincg. Reuse terms not verified; page link only."
- AKL-038: "Facebook post by Isa Pelonio Aragon. Reuse terms not verified; page link only."
- AKL-042: "Google Images is a discovery link, not an image license. Check the selected photo’s original source and reuse terms."
- AKL-049: "Department of Science and Technology – Food and Nutrition Research Institute, Philippine Food Composition Table. Follow the source’s reuse terms."
- AKL-062: "Facebook post; photographer/uploader credit and reuse terms are not independently stated. Signed CDN URL expires 2026-11-21 22:48 UTC."
- AKL-068: "Instagram post (poster not shown). Reuse terms not verified; page link only."
- AKL-072: "Facebook page Viva Ibajay (Agto Kamo sa Ibajay). Reuse terms not verified; page link only."
- AKL-079: "Facebook page Viva Ibajay (Agto Kamo sa Ibajay). Reuse terms not verified; page link only."
- AKL-081: "Facebook page of Adelfa Espanola (Adel's Polvoron). Reuse terms not verified; page link only."
- AKL-085: "Boracay Island News; check the article for photographer credit and reuse terms."
- AKL-088: "Madyaas Pen article; individual photographer credit and reuse terms are not separately stated."
- AKL-091: "Wikimedia Commons; license and photographer are listed on the linked file page."
- AKL-120: "Photo credit: Rich ’n Ritch (Flickr). Check the Flickr page for applicable reuse terms."
- AKL-132: "Blog 'Aklan's Food Delicacies' (bertietalimongan.wordpress.com). Reuse terms not verified; page link only."
- AKL-136: "Aklan State University (asu.edu.ph). Reuse terms not verified; page link only."
- AKL-144: "Pinterest pin; original photographer and reuse rights not verified."
- AKL-146: "Deutsche Welle; credit and reuse terms should be checked on the article."
- AKL-166: "Flickr uploader: E. Escobar, as identified by the source account. Check the Flickr page for applicable reuse terms."
- AKL-179: "Studocu document thumbnail; original creator and reuse rights not verified."
- AKL-187: "SEAFDEC Aquaculture Department field guide; the guide credits its author for drawings and photographs. Reuse terms are not otherwise stated."
- AKL-189: "Blog 'Diverse Cultures of our Community' (newwashingtoncultures.blogspot.com). Reuse terms not verified; page link only."
- AKL-190: "Blog 'Diverse Cultures of our Community' (newwashingtoncultures.blogspot.com). Reuse terms not verified; page link only."
- AKL-196: "Sandee (sandee.com), Camanci Beach page. Reuse terms not verified; page link only."
- AKL-197: "Bombo Radyo Kalibo. Reuse terms not verified; page link only."
- AKL-199: "Madyaas Pen blog (madyaaspen.blogspot.com). Reuse terms not verified; page link only."
- AKL-212: "Boracay Island News; check the article for photographer credit and reuse terms."

### Every image row

| Record ID | Verdict | Reasons |
| --- | --- | --- |
| AKL-001 | pass | passes rules 1 to 5 |
| AKL-002 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-003 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-004 | pass | passes rules 1 to 5 |
| AKL-005 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-006 | fail | 4: licence unclear |
| AKL-007 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-008 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is application/pdf; 1: no recorded evidence that the URL is a direct image; 4: licence not-stated |
| AKL-009 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-010 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-011 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: subject note says partial, name-only, illustrative or generic; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-012 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-013 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-014 | fail | 4: licence unclear |
| AKL-015 | fail | 4: licence not-stated |
| AKL-016 | fail | 1: URL is a page, search result or PDF, not an image file; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-017 | fail | 4: licence not-stated |
| AKL-018 | fail | 4: licence not-stated |
| AKL-019 | fail | 4: licence not-stated |
| AKL-020 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-021 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-023 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-024 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-025 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-026 | hold | 3: Shows a single landmark standing for the whole municipality overview; needs an owner decision that it represents Banga. |
| AKL-027 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-028 | fail | 4: licence see-source |
| AKL-029 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-030 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-031 | fail | 4: licence not-stated |
| AKL-032 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-033 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-034 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-035 | fail | 4: licence not-stated |
| AKL-036 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-038 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-040 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-041 | fail | 4: licence not-stated |
| AKL-042 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-043 | fail | 4: licence not-stated |
| AKL-044 | fail | 4: licence not-stated |
| AKL-045 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-046 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-047 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-048 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-049 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: subject note says partial, name-only, illustrative or generic; 4: licence unclear |
| AKL-050 | fail | 3: subject note says partial, name-only, illustrative or generic; 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-051 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-052 | fail | 4: licence not-stated |
| AKL-053 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-054 | fail | 4: licence not-stated |
| AKL-055 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-056 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-057 | fail | 4: licence see-source |
| AKL-058 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-059 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-060 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-061 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-062 | fail | 2: result does not record verification of an image; 4: licence unclear; 5: signed or expiring link |
| AKL-063 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-064 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-065 | fail | 4: licence not-stated |
| AKL-066 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-067 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-068 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-069 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-070 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-071 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-072 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-073 | fail | 4: licence not-stated |
| AKL-074 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-075 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-076 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-077 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-078 | fail | 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-079 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-080 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-081 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-082 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-083 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-084 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-085 | fail | 4: licence unclear |
| AKL-086 | fail | 4: licence not-stated |
| AKL-087 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-088 | fail | 2: result does not record verification of an image; 4: licence unclear |
| AKL-089 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-090 | fail | 4: licence not-stated |
| AKL-091 | fail | 4: licence unclear |
| AKL-092 | fail | 4: licence not-stated |
| AKL-093 | fail | 4: licence not-stated |
| AKL-094 | fail | 4: licence not-stated |
| AKL-095 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-096 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-097 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-098 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-101 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-102 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-103 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-104 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-105 | fail | 4: licence not-stated |
| AKL-106 | fail | 4: licence not-stated |
| AKL-107 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-108 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-109 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-110 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-111 | fail | 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-112 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-113 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-114 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-115 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-116 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-117 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-118 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-119 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-120 | fail | 4: licence unclear |
| AKL-121 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-122 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-123 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-124 | fail | 4: licence not-stated |
| AKL-125 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-126 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-127 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-128 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-129 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-130 | fail | 3: subject note says partial, name-only, illustrative or generic; 4: licence not-stated |
| AKL-132 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-133 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-134 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-135 | fail | 4: licence not-stated |
| AKL-136 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-137 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-138 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-140 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-141 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-142 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-143 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-144 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-145 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-146 | fail | 4: licence unclear |
| AKL-147 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-148 | fail | 4: licence not-stated |
| AKL-149 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-150 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-151 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-152 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-153 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-154 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-155 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-156 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-157 | fail | 4: licence not-stated |
| AKL-158 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-159 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-160 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-161 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-162 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-163 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-164 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-165 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-166 | fail | 4: licence unclear |
| AKL-167 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is text/html; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-168 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-169 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-170 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-171 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-172 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-173 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-174 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-175 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-176 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-177 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-178 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-179 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-180 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-181 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-182 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-183 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-184 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-185 | fail | 3: subject note says partial, name-only, illustrative or generic; 4: licence not-stated |
| AKL-186 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-187 | fail | 1: URL is a page, search result or PDF, not an image file; 1: recorded content type is application/pdf; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-188 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-189 | fail | 1: URL is a page, search result or PDF, not an image file; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-190 | fail | 1: URL is a page, search result or PDF, not an image file; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: subject note says partial, name-only, illustrative or generic; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-191 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-192 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-193 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-194 | fail | 2: result does not record verification of an image; 4: licence not-stated; 5: signed or expiring link |
| AKL-195 | fail | 4: Creative Commons licence needs a linked licence notice the truncated credit strip cannot show (held) |
| AKL-196 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence unclear |
| AKL-197 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-198 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-199 | fail | 1: URL is a page, search result or PDF, not an image file; 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 3: download result says PARTIAL or NAME-ONLY; 4: licence unclear |
| AKL-200 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-201 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-202 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-203 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-204 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-205 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-206 | fail | 4: licence not-stated |
| AKL-207 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-208 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-209 | fail | 2: result does not record verification of an image; 4: licence not-stated |
| AKL-210 | fail | 2: result does not record verification of an image; 4: licence see-source |
| AKL-211 | fail | 1: no recorded evidence that the URL is a direct image; 2: result does not record verification of an image; 4: licence not-stated |
| AKL-212 | fail | 4: licence unclear |

## Cards that truncate

158 of 158 live workbook records have a description longer than the card teaser (first sentence). The card also clamps the name to two lines and the teaser to one. The full text is in the Explore details panel and on the municipality page. Records: AKL-002, AKL-006, AKL-009, AKL-010, AKL-011, AKL-012, AKL-013, AKL-015, AKL-016, AKL-017, AKL-018, AKL-019, AKL-020, AKL-021, AKL-023, AKL-024, AKL-025, AKL-027, AKL-028, AKL-030, AKL-031, AKL-036, AKL-038, AKL-040, AKL-041, AKL-042, AKL-043, AKL-044, AKL-045, AKL-046, AKL-047, AKL-049, AKL-050, AKL-052, AKL-053, AKL-054, AKL-055, AKL-057, AKL-058, AKL-059, AKL-060, AKL-061, AKL-062, AKL-063, AKL-064, AKL-065, AKL-066, AKL-067, AKL-068, AKL-069, AKL-072, AKL-073, AKL-074, AKL-075, AKL-076, AKL-077, AKL-078, AKL-079, AKL-080, AKL-081, AKL-085, AKL-086, AKL-087, AKL-088, AKL-089, AKL-090, AKL-092, AKL-093, AKL-095, AKL-096, AKL-097, AKL-098, AKL-101, AKL-102, AKL-103, AKL-104, AKL-105, AKL-107, AKL-108, AKL-109, AKL-110, AKL-111, AKL-112, AKL-113, AKL-115, AKL-117, AKL-119, AKL-120, AKL-121, AKL-122, AKL-123, AKL-124, AKL-126, AKL-127, AKL-130, AKL-132, AKL-134, AKL-135, AKL-136, AKL-137, AKL-138, AKL-140, AKL-142, AKL-143, AKL-144, AKL-145, AKL-146, AKL-147, AKL-149, AKL-150, AKL-151, AKL-153, AKL-154, AKL-155, AKL-156, AKL-157, AKL-158, AKL-159, AKL-161, AKL-162, AKL-164, AKL-165, AKL-166, AKL-167, AKL-168, AKL-169, AKL-171, AKL-172, AKL-173, AKL-175, AKL-176, AKL-177, AKL-179, AKL-182, AKL-183, AKL-184, AKL-185, AKL-186, AKL-187, AKL-188, AKL-189, AKL-190, AKL-191, AKL-192, AKL-194, AKL-195, AKL-196, AKL-198, AKL-199, AKL-200, AKL-201, AKL-203, AKL-205, AKL-206, AKL-207, AKL-208, AKL-210, AKL-212.

## Counts

| | Before | After |
| --- | --- | --- |
| Raw attractions slots | 89 | 117 |
| Raw festivals slots | 34 | 40 |
| Raw products slots | 19 | 72 |
| Of which nameless paragraphs | 32 | 32 |
| Named municipality records | 110 | 197 |
| Explore total (adds 10 resorts and 478 stays) | 598 | 685 |

| Municipality | Named before | Named after | Records sharing the municipality-centre pin |
| --- | --- | --- | --- |
| Altavas | 3 | 9 | 9 |
| Balete | 5 | 10 | 10 |
| Banga | 4 | 5 | 5 |
| Batan | 12 | 18 | 18 |
| Buruanga | 12 | 19 | 19 |
| Ibajay | 6 | 14 | 14 |
| Kalibo | 16 | 22 | 22 |
| Lezo | 1 | 7 | 7 |
| Libacao | 7 | 13 | 13 |
| Madalag | 4 | 6 | 6 |
| Makato | 1 | 6 | 6 |
| Malay | 12 | 18 | 18 |
| Malinao | 5 | 9 | 9 |
| Nabas | 4 | 7 | 7 |
| New Washington | 5 | 14 | 14 |
| Numancia | 4 | 9 | 9 |
| Tangalan | 9 | 11 | 11 |

Every municipality record uses the approximate centre pin, so the last column is also the number of records stacked on that pin.

## Nameless paragraphs that may describe a workbook record

- AKL-006 Macawiwili Falls: mentioned in altavas.attractions[2]
- AKL-011 Puto Seko: mentioned in altavas.products[0]
- AKL-023 Piña cloth: mentioned in balete.products[0]
- AKL-024 Pinipig: mentioned in balete.products[0]
- AKL-025 Rambutan: mentioned in balete.products[0]
- AKL-053 Ariel’s Point: mentioned in buruanga.attractions[3]
- AKL-079 Linumak: mentioned in ibajay.products[0]
- AKL-081 Pulvoron: mentioned in ibajay.products[0]
- AKL-109 Lezo Plaza: mentioned in lezo.attractions[0]
- AKL-111 Ampaw: mentioned in lezo.products[0]
- AKL-137 Baybay Beach: mentioned in makato.attractions[1]
- AKL-138 Salimuno Falls: mentioned in makato.attractions[1]
- AKL-134 Sto. Niño Ati-atihan: mentioned in makato.festivals[0]
- AKL-157 Calamansi muffins: mentioned in malay.products[0]
- AKL-158 Chori burger: mentioned in malay.products[0]
- AKL-162 Malinao Ati-atihan: mentioned in malinao.festivals[0]
- AKL-186 Crabs and prawns: mentioned in new-washington.products[0]
- AKL-187 Hale-hale: mentioned in new-washington.products[0]
- AKL-189 Sasing: mentioned in new-washington.products[0]
- AKL-191 Tamiluk: mentioned in new-washington.products[0]
- AKL-185 Amboeong: mentioned in new-washington.products[1]
- AKL-188 Ibos: mentioned in new-washington.products[1]
- AKL-190 Suman: mentioned in new-washington.products[1]
- AKL-192 Tuba: mentioned in new-washington.products[2]
- AKL-201 Lechon: mentioned in numancia.products[0]

## Proposals (not built)

- A credit line that can carry a licence link and show in full; this would allow the 7 Creative Commons images (after their other checks).
- An image in the Explore details panel.
- A municipality page photo (would give AKL-001 a slot, and AKL-026 after a subject decision).
- Owner review of the 4 held records, the 26 pending pairs and the 13 unmatched entries; decisions can be added later without renumbering links.

## Blocked

- Owner confirmation that the workbook hash above is the approved file.
- Nothing else is blocked; held items are listed above.
