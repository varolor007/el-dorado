# The delivery of the guide writer

`delivery.json`, one object with exactly these fields. The texts are for the traveller: they are written in the
language given in `language` of `in/trip.json`.

| Field | What it is |
|---|---|
| `seat` | Always `"guide-writer"` |
| `language` | The `language` of `in/trip.json`, copied |
| `cover` | `{ "title": "<the trip in a few words>", "intro": "<one or two sentences>" }` |
| `days` | One entry per day of `in/days.json`, all of them, once, in their order |
| `todo` | One entry per entry of `in/todo.json`, all of them, once. Empty list if there are none |
| `unknowns` | What is not known and the traveller should know, at most 6. Empty list if nothing |

The examples in this file show the form only. A text for the traveller is a placeholder between `<` and `>`,
because yours goes in the language of `in/trip.json`, whichever it is.

## An entry of `days`

`{ "date": "<the date of the day, as in in/days.json>", "title": "<the day in a few words>", "intro": "<one or two
sentences>", "stops": [...], "legs": [...] }`

- `date`: as in `in/days.json`.
- `stops`: one entry per stop of that day, all of them, once:
  `{ "id": "<the id of the stop>", "what": "<what it is>", "why": "<why they go>", "when": "<when it is best>" }`.
- `legs`: one entry per leg of that day, all of them, once:
  `{ "from": "<stay or the id of a stop>", "to": "<the id of a stop>", "says": "<one sentence>" }`.

## An entry of `todo`

`{ "item": 0, "says": "<one sentence: what to have done, and by when if it has a deadline>" }`

- `item`: the position, as in `in/todo.json`.

## Numbers

Every number in every text is a number of your material: minutes, metres, a day of the month, a year, how many
travel. Written as a number, not as a word, the way the traveller's language writes numbers: the house reads both
`1.5` and `1,5` as the same number. No prices and no clock times (GW3).
