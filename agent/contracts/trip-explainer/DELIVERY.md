# The delivery of the trip explainer

`out/delivery.json`, one object with exactly these fields. The texts are for the traveller: they are written in the
language given in `language` of `in/trip.json`.

| Field | What it is |
|---|---|
| `seat` | Always `"trip-explainer"` |
| `language` | The `language` of `in/trip.json`, copied |
| `ways` | One entry per way of `in/ways.json`, all of them, once |
| `levers` | One entry per entry of `in/levers.json`, all of them, once. Empty list if there are none |
| `unknowns` | What is not known or not confirmed, for the traveller. Empty list if nothing |

## An entry of `ways`

`{ "id": "best_value", "why": "Es el que más te da por lo que cuesta.", "gains": "55 euros más que el más barato
que encontramos, a 4 minutos menos andando de lo que vas a ver.", "loses": "No se puede cancelar." }`

- `id`: `cheapest`, `best_value` or `different`, as in `in/ways.json`.
- `why`, `gains`, `loses`: for the traveller. None is empty.

## An entry of `levers`

`{ "lever_row": "l6", "what": "Si sales el jueves en vez del viernes, ahorras 81 euros.", "in_exchange": "Cambian
tus fechas: del 4 al 7 de marzo." }`

- `lever_row`: as in `in/levers.json`.
- `what`, `in_exchange`: for the traveller. None is empty.

## Numbers

Every number in every text is a number of `in/ways.json`, `in/levers.json` or `in/trip.json`: a total, a saving, a
difference, a count of minutes, a day of the month. Written as a number, not as a word, so that the house can check
it.
