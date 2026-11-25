# The delivery of the local-knowledge seat

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"local-knowledge"` |
| `items` | What a traveller is glad to know, `items_allowed` at most and `per_kind` of each class. Empty list if nothing |
| `unknowns` | What you could not find out or left out: plain sentences, each in one line of 300 characters at most and with no web address in it (name the site in words). Empty list if nothing |

The examples in this file are invented. They come from different kinds of trip, so that you copy none: they show
the form only, and everything you write comes from the pages you open.

## An entry of `items`

`{ "kind": "market", "zone": "z2", "name": "Harbour Fish Hall", "point": { "lat": 41.12, "lon": -8.61 }, "says":
"Fish and fruit stalls; closed on Sundays, open from 07:00.", "figures": ["07:00"], "costs": "unknown", "source":
"https://www.example.org/markets/harbour", "seen": "2031-02-11" }`

`{ "kind": "meal_cost", "zone": null, "name": "unknown", "point": "unknown", "says": "A set lunch on a weekday costs
12 to 18 EUR.", "figures": [], "costs": { "from": 12, "to": 18, "currency": "EUR" }, "source":
"https://visit.example.net/eating-out", "seen": "2031-01-30" }`

`{ "kind": "practical", "zone": null, "name": "unknown", "point": "unknown", "says": "Plugs are type G, 230 V; the
emergency number is 999.", "figures": [230, 999], "costs": "unknown", "source": "https://gov.example.com/visitors",
"seen": "2031-03-02" }`

- `kind` is `neighbourhood`, `hours`, `money`, `practical`, `avoid`, `food_area`, `market`, `dish` or `meal_cost`
  (RL2).
- `zone` is the `id` of a zone in `route.json`, or `null` for the whole destination. `neighbourhood`, `food_area` and
  `market` always have one (RL6).
- `name` is the proper name the page gives (a neighbourhood, a market, a street, a dish), `name_letters` at most, or
  `unknown`. Never a restaurant, a café or a bar (RL4). `meal_cost` has `unknown`.
- `point` is `{ "lat": ..., "lon": ... }` if the page gives where it is and it has a zone, inside that zone; else
  `unknown`.
- `says` is one sentence, in the traveller's `language`, of `letters` at most: what the traveller reads (RL8).
- `figures` holds every number of `says` as the page gives it, a time as `"HH:MM"`, `figures_allowed` at most;
  the numbers of a price go in `costs` instead. Empty list if `says` has no number (RL7).
- `costs` is `unknown`, or `{ "from": 12, "to": 18, "currency": "EUR" }` as the page gives it. Only the food classes
  carry it, and `meal_cost` always does: the price of one meal for one person (RL5).
- `source` is the full `https` address of the page you opened; `seen` is the date the page gives for the fact, or
  `today`, as `YYYY-MM-DD` (RL1).
