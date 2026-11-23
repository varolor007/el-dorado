# The delivery of the route planner

`out/delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"route-planner"` |
| `shape` | `single_base`, `base_with_day_trips` or `route` |
| `bases` | Where the traveller sleeps, in the order of the trip. One base for `single_base` and `base_with_day_trips`; two or more for `route` |
| `transfers` | One entry between each base and the next. Empty list with one base |
| `entry` | Where the trip starts: the first base |
| `exit` | Where the trip ends: the last base |
| `musts` | What happened to each must of the traveller that is about a place or about the route. Empty list if none |
| `left_out` | What the traveller might expect and does not fit, with its reason. Empty list if nothing |
| `unknowns` | What you could not know, in plain sentences. Empty list if nothing |

## An entry of `bases`

`{ "id": "b1", "name": "Old town", "nights": 4, "why": "the cathedral, the castle and the river front are all here",
"zones": [ ... ] }`

- `id`: `b1`, `b2`, and so on, in order.
- `name`: the city, town or area where the traveller sleeps.
- `nights`: a whole number, 1 or more. With more than one base, 2 or more. The nights of all the bases add up to
  `nights` in `in/days.json`.
- `why`: why sleep here, in facts.
- `zones`: one to three zones.

## An entry of `zones`

`{ "id": "z1", "name": "Around the cathedral", "anchors": ["Q111", "Q222"], "radius_m": 1200, "near": ["Q111",
"Q333", "Q444"], "why": "between the cathedral and the river, with the market two streets away" }`

- `id`: `z1`, `z2`, and so on. No two zones share an id, in any base.
- `anchors`: one to three `id`s of `in/places.json`.
- `radius_m`: one of `500`, `800`, `1200`, `1500`, `2000`, `3000`.
- `near`: up to eight `id`s of `in/places.json`, the most important for this traveller first. May be empty.
- `why`: what is there, in facts.

## An entry of `transfers`

`{ "from": "b1", "to": "b2", "minutes": 95, "by": "train", "source": "t3" }`

`from` and `to` are base ids, one after the other in the order of the trip. `by` is `train`, `bus`, `car`, `ferry`
or `flight`. `minutes` and `source` are copied from the entry of `in/transfers.json` you rely on: `source` is its
reference. If `in/transfers.json` does not have it, both are `"unknown"`.

## `entry` and `exit`

`{ "base": "b1", "why": "the airport the traveller flies into is here" }`

## An entry of `musts`

`{ "what": "sunset by the sea", "covered": true, "where_or_why": "b1: the river front is in zone z1" }`

`what` is the `thing` of the taste in `in/trip.json`, copied. `covered` is `true` or `false`. `where_or_why` says
where the route covers it, or why it does not.

## An entry of `left_out`

`{ "what": "the northern valley", "why": "two transfers of half a day each for one night there" }`
