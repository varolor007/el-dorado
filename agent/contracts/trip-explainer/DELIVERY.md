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

The examples in this file show the form only. A text for the traveller is a placeholder between `<` and `>`,
because yours goes in the language of `in/trip.json`, whichever it is. The examples in English are invented, two
of different kinds each time, so that you copy neither. In them `<amount>`, `<minutes>` and `<day>` stand for
numbers copied from your material, and `<currency>` for the currency of the trip, which is `currency` in
`in/ways.json`: an example fixes neither a language nor a currency.

## An entry of `ways`

`{ "id": "best_value", "why": "<one sentence in the traveller's language: why this way is this one>", "gains":
"<what is gained with it compared with the cheapest we found, with its numbers>", "loses": "<what is lost with
it>" }`

Two examples of a `gains`, in English only to show the form: `It costs <amount> <currency> more than the cheapest
we found and it is <minutes> minutes closer on foot to what you are going to see.` Or `For <amount> <currency>
more than the cheapest we found, it has a pool to swim in and it can be cancelled.`

- `id`: `cheapest`, `best_value` or `different`, as in `in/ways.json`.
- `why`, `gains`, `loses`: for the traveller. None is empty.

## An entry of `levers`

`{ "lever_row": "l6", "what": "<one sentence in the traveller's language: what they would do and what it saves>",
"in_exchange": "<one sentence in the traveller's language: what it costs them>" }`

Two examples of a `what` with its `in_exchange`, in English only to show the form: `If you leave a day earlier, on
the <weekday>, you save <amount> <currency>.` with `Your dates change: you arrive on the <day> and you leave on
the <day>.` Or `If you sleep in <the other zone>, you save <amount> <currency>.` with `You walk <minutes> minutes
more to what you are going to see.`

- `lever_row`: as in `in/levers.json`.
- `what`, `in_exchange`: for the traveller. None is empty.

## Numbers

Every number in every text is a number of `in/ways.json`, `in/levers.json` or `in/trip.json`: a total, a saving, a
difference, a count of minutes, a day of the month. Written as a number, not as a word, so that the house can check
it, and written the way the traveller's language writes numbers: the house reads both `263.87` and `263,87` as the
same number.
