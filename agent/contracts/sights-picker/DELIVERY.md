# The delivery of the sights picker

`out/delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"sights-picker"` |
| `go` | What is worth this traveller's time, the most important first |
| `skip` | What is not, with its why |
| `missing` | What this traveller would expect and the list does not have. Empty list if nothing |
| `unknowns` | What you could not know, in plain sentences. Empty list if nothing |

Every place of `in/sights.json` is in `go` or in `skip`, once.

## An entry of `go`

`{ "id": "Q111", "why": "La catedral más antigua de la ciudad, con un claustro que se visita en media hora.",
"minutes": 45, "best_time": "morning", "book_ahead": "unknown", "must": false }`

- `id`: an `id` of `in/sights.json`.
- `why`: why go, for this traveller, in the traveller's language. One or two sentences, with a fact from `about`.
- `minutes`: one of `30`, `45`, `60`, `90`, `120`, `180`, `240`.
- `best_time`: `morning`, `afternoon`, `evening` or `any`.
- `book_ahead`: `yes`, `no` or `unknown`.
- `must`: `true` or `false`. At most two `true` per night of the trip.

## An entry of `skip`

`{ "id": "Q222", "why": "Un edificio de oficinas del gobierno: se ve desde la calle, sin visita." }`

`why` is in the traveller's language too: the traveller can read why something was left out.

## An entry of `missing`

`{ "what": "a food market where to eat", "why": "they want to eat well and the list has no market" }`
