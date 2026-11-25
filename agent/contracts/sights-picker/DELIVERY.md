# The delivery of the sights picker

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"sights-picker"` |
| `go` | What is worth this traveller's time, the most important first |
| `skip` | What is not, with its why |
| `missing` | What this traveller would expect and the list does not have. Empty list if nothing |
| `unknowns` | What you could not know, in plain sentences. Empty list if nothing |
| `changed` | Only when `in/message.json` exists: what changed and why, for the traveller. Never otherwise |

Every place of `in/sights.json` is in `go` or in `skip`, once.

The examples in this file are invented. A text for the traveller is shown as a placeholder between `<` and `>`,
because yours goes in the language of `in/trip.json`, whichever it is. Where there are two examples, they are of
two different kinds of place, so that you copy neither: they show the form only.

## An entry of `go`

`{ "id": "Q111", "why": "<one or two sentences in the traveller's language: what the place is, from its about, and
why it matters to this traveller>", "minutes": 45, "best_time": "morning", "book_ahead": "unknown", "must": false }`

Two examples of such a `why`, in English only to show the form: `A science museum with a whole floor of hands-on
rooms: you travel with two children.` Or `A marked path along the lake shore, flat all the way: you said you want
easy walks.`

- `id`: an `id` of `in/sights.json`.
- `why`: why go, for this traveller, in the traveller's language. One or two sentences, with a fact from `about`.
- `minutes`: one of `30`, `45`, `60`, `90`, `120`, `180`, `240`.
- `best_time`: `morning`, `afternoon`, `evening` or `any`.
- `book_ahead`: `yes`, `no` or `unknown`.
- `must`: `true` or `false`. At most two `true` per night of the trip.

## An entry of `skip`

`{ "id": "Q222", "why": "<one sentence in the traveller's language: the fact that makes it not worth their time>" }`

Two examples of such a `why`, in English only to show the form: `An office building that is not open to visitors.`
Or `A summit that its description gives as a full day of climbing: you asked for an easy pace.`

`why` is in the traveller's language too: the traveller can read why something was left out.

## `changed`

`"changed": "<one to three sentences in the traveller's language: what you took out, what you brought in and what
moved up, each with its reason from what they said>"`

Two examples, in English only to show the form: `You asked for fewer museums: two of them are out, and the walk by
the river and the market take their place.` Or `You asked for a beach day: there is no beach in what open data
knows of this place, so nothing changed for that.`

## An entry of `missing`

`{ "what": "somewhere to swim", "why": "they asked for a day in the water and the list has no beach, lake or pool" }`

`{ "what": "a place with live music", "why": "they asked for music at night and the list has no venue" }`
