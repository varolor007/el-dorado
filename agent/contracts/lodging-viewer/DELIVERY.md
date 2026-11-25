# The delivery of the lodging viewer

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"lodging-viewer"` |
| `lodging_id` | The `lodging_id` of `in/sheet.json`, copied |
| `room_id` | The `room.id` of `in/sheet.json`, copied; `"unknown"` if the sheet does not know the room |
| `photos` | The inventory: one entry per file in `in/photos/`, none missing and none added |
| `fields` | One entry per field of the table below |
| `review_themes` | What guests say, by theme. May be empty if there are no reviews |
| `conflicts` | Where photos and reviews disagree. Empty list if nowhere |
| `warnings` | What exists but may not be there for this stay. Empty list if nothing |
| `serious` | The serious complaints you confirm by reading the reviews. Empty list if none |
| `unknowns` | What you could not see or check, in plain sentences. Empty list if nothing |
| `summary_good` | One sentence: the best of this lodging, with its fact |
| `summary_bad` | One sentence: the worst of this lodging, with its fact. `"unknown"` if you found nothing bad |

## An entry of `photos`

`{ "file": "room-01.jpg", "shows": "room", "seen": ["light wooden floor", "double bed", "window onto a street"] }`

`shows` is one of: `room`, `bathroom`, `view`, `gym`, `pool`, `common`, `food`, `exterior`, `other`.

## An entry of `fields`

`"gym": { "level": "maintenance", "evidence": [ { "kind": "photo", "ref": "hotel-07.jpg", "what": "two treadmills,
one bike and a rack of dumbbells in a room with a window" } ], "note": "" }`

- `level`: one of the levels of that field, or `"unknown"`.
- `evidence`: at least one entry unless the level is `unknown`. `kind` is `photo` (then `ref` is a file of
  `in/photos/`, with its extension), `review` (then `ref` is a reference of `in/reviews.json`, such as `r12`) or
  `sheet` (then `ref` is the field of `in/sheet.json` you rely on, one of: `room.name`, `room.size_m2`, `room.beds`,
  `room.declared_views`, `services`, `stay.check_in`, `stay.check_out`, `stay.season`, `photos`). A field of the
  sheet whose value is `unknown` or empty supports nothing.
- A photo supports a field only if your inventory says it shows that: `gym` needs a photo you inventoried as `gym`,
  `pool` one you inventoried as `pool`, and the fields of the room one you inventoried as `room`, `bathroom` or `view`.
- `note`: anything the house should know about this level. May be empty.

The fields `look`, `style`, `room_space`, `room_light`, `bathroom` and `view` are of the room being offered: a
`photo` entry in their evidence must be a `room-NN` file. When the sheet gives `room.size_m2`, the evidence of
`room_space` must include it. A level of `gym` or `pool` other than `none` and `unknown` needs a photo or a review:
the sheet alone is not enough.

`look` is what the photos of the room show: its evidence must include a `room-NN` photo, and reviews may be added to
it. `upkeep` is what recent guests report about cleanliness and maintenance: its evidence is reviews only, never a
photo, because official photos do not show how a place is kept. With no review that speaks of it, `upkeep` is
`unknown`.

## The fields and their levels

| Field | Level | It means |
|---|---|---|
| `look` | `new_or_renovated` | In the photos, finishes, furniture and bathroom look recent; no visible wear |
| | `good_condition` | Not new, but nothing in the photos looks worn, stained or patched |
| | `dated` | Clearly from another decade: old finishes, old screen, old bathroom |
| | `worn` | Wear, stains, damage or repairs left undone are visible in the photos |
| `upkeep` | `well_kept` | Recent guests say it is clean and that things work; no repeated complaint about maintenance |
| | `some_complaints` | A few recent reviews report something dirty, broken or worn; it is not a pattern |
| | `neglected` | Several recent reviews report dirt, damage, mould, smells or repairs left undone |
| `style` | `modern_plain` | Clean lines, few colours, little decoration |
| | `classic` | Traditional furniture, mouldings, heavy fabrics |
| | `character` | A look of its own: design pieces, local materials, a clear idea |
| | `chain` | Standard, functional, the same as in any city |
| | `rustic` | Wood, stone, country house |
| `room_space` | `roomy` | Room for a seating area or a desk besides the bed, and to walk around the bed freely |
| | `fits` | The bed, a way around it and somewhere to put a suitcase |
| | `tight` | Little more than the bed; the suitcase has no place of its own |
| `room_light` | `bright` | A large window or several; daylight reaches the whole room |
| | `average` | One ordinary window |
| | `dark` | A small or interior window, or no visible window |
| `bathroom` | `modern` | Walk-in shower with a screen, or a recent bathtub; current taps; clean joints |
| | `correct` | Not recent, but in good order |
| | `dated` | Old bathtub with a curtain, old taps, worn joints |
| `view` | `open` | The room looks onto the sea, the city, a river, a park or mountains |
| | `street` | Onto an ordinary street or the building across |
| | `inner_or_wall` | Onto an inner courtyard, a light well or a wall |
| `gym` | `full` | Cardio, free weights and a rack or cable machines: enough to train properly |
| | `maintenance` | Some cardio and dumbbells: enough to keep up |
| | `token` | Two or three machines in a small room |
| | `none` | The sheet lists no gym, and no photo or review shows one |
| `pool` | `swim` | Long enough to swim lengths |
| | `bathe` | Enough to bathe and cool off, not to swim |
| | `dip` | A plunge pool or a tub-sized pool |
| | `none` | The sheet lists no pool, and no photo or review shows one |

Every one of the nine fields must be present. The level `none` needs its evidence too: `kind` `sheet`, `ref`
`services`. If any level is `unknown`, `unknowns` says why in a sentence.

## An entry of `review_themes`

`{ "theme": "noise", "tone": "bad", "mentions": "several", "says": "thin walls: the next room is heard at night",
"refs": ["r4", "r19"] }`

`{ "theme": "bed", "tone": "good", "mentions": "a_few", "says": "a firm mattress and good pillows", "refs": ["r2",
"r7", "r11"] }`

Both are invented and show the form only: what you write in `says` is what the reviews you were given say.

`theme` is one of: `cleanliness`, `maintenance`, `noise`, `room_size`, `bed`, `bathroom`, `light`, `temperature`,
`smell`, `view`, `breakfast`, `food`, `staff`, `location`, `access`, `parking`, `wifi`, `gym`, `pool`,
`common_areas`, `kitchen`, `privacy`, `safety`, `value`, or `other` when none of them fits. The list is closed
because the house shows the theme to the traveller in their language; what the theme is about goes in `says`, which
the traveller does not read. One entry per theme and tone: do not repeat a theme with the same tone.

`tone` is `good`, `bad` or `mixed`. `mentions` is `one`, `a_few` or `several`: do not write a number, the house
counts. `refs` are references that exist in `in/reviews.json`.

## An entry of `conflicts`

`{ "what": "the room looks new in its photos; several recent reviews found it dirty", "refs": ["room-02.jpg", "r6",
"r21"] }`

## An entry of `serious`

`{ "kind": "pests", "mentions": "a_few", "refs": ["r3", "r11"] }`

`kind` is one of: `pests` (bed bugs, cockroaches, mice and the like), `mould`, `theft` (something stolen from the
room or the lodging), `scam` (charged for what was not agreed, or a lodging that was not what was sold) or `unsafe`
(a guest felt in danger there, or a door or a lock that does not close). `mentions` is `one`, `a_few` or `several`,
as in `review_themes`. `refs` are references that exist in `in/reviews.json`. One entry per kind.

An entry is a complaint only if a guest reports it as something that happened in their stay. A review that says
there was none (`no bed bugs, luckily`), that quotes a rumour or that speaks of another place is not one. With `a_few`
or `several` the house discards the lodging for this traveller, so be exact: do not raise it on one word, and do not
leave it out when the reviews say it plainly.

## An entry of `warnings`

`{ "what": "one recent review says the sauna was closed for works", "label": "seen", "refs": ["r8"] }`

`{ "what": "the bar of the photos is on an open-air terrace and the sheet gives the season as winter: it may be
closed", "label": "deduced", "refs": ["hotel-12.jpg", "stay.season"] }`

Both are invented and show the form only.

`label` is `seen` (a review or the sheet says it) or `deduced` (it follows from what you saw). `refs`, at least one,
are files of `in/photos/`, references of `in/reviews.json` or fields of `in/sheet.json`. The same goes for the `refs`
of `conflicts`. A warning about the season cites `stay.season`, and there is none when `stay.season` is `unknown`:
the season is never deduced from the dates.

## The answer delivery

When `in/question.json` is there, `delivery.json` is one object with exactly these fields, and no other.

| Field | What it is |
|---|---|
| `seat` | Always `"lodging-viewer"` |
| `mode` | Always `"question"` |
| `lodging_id` | The `lodging_id` of `in/sheet.json`, copied |
| `question_id` | The `id` of `in/question.json`, copied |
| `answer` | One of `yes`, `no`, `partly`, `unknown` |
| `evidence` | What shows it: entries like those of `fields`, `{ "kind", "ref", "what" }`. At least one unless `unknown` |
| `says` | One sentence for the traveller, in their language: the answer and what shows it. No link, no promise |
| `unknowns` | What would be needed to answer and is not in the material, in plain sentences. Empty list if nothing |

`{ "seat": "lodging-viewer", "mode": "question", "lodging_id": "x7", "question_id": "q1", "answer": "partly",
"evidence": [ { "kind": "photo", "ref": "hotel-04.jpg", "what": "two treadmills and a rack of dumbbells" } ],
"says": "The gym photo shows a rack of dumbbells, but no bench or barbell.", "unknowns": [] }` is invented and shows
the form only.

`ref` follows the same rules as in `fields`: a photo of `in/photos/` with its extension, a reference of
`in/reviews.json`, or a field of `in/sheet.json`. `says` is plain text in one line, of 500 characters at most.
