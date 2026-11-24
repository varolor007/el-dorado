# The delivery of the trip crosser

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"trip-crosser"` |
| `levers` | One entry per lever of `in/levers.json`, all of them, once |
| `ways` | The three ways of doing the trip |
| `tell` | The lever rows worth telling the traveller, the most useful first. Four at most. Empty list if none |
| `checks` | What the table does not see, looked at. Empty list if nothing |
| `requests` | What you ask the house to price for another round. Empty list in round 2 |
| `unknowns` | What you could not know, in plain sentences. Empty list if nothing |

The examples in this file are invented and show the form only. Their numbers stand for the numbers of your own
`in/table.json`, which come in its `currency`, whichever it is, and may be of any size: an example fixes neither
a currency nor an amount. Where there are two examples, they are of two different kinds, so that you copy neither.

## An entry of `levers`

`{ "lever": "shift_dates", "status": "tested", "rows": ["l3", "l4"], "reason": "leaving a day earlier is the only
change of dates that saves" }`

- `lever`: an `id` of `in/levers.json`.
- `status`: `tested`, `discarded` or `not_available`.
- `rows`: the lever rows of `in/table.json` that test it, by `id`. At least one if `tested`; empty otherwise.
- `reason`: always. In facts.

A lever whose rows are in the table is `tested` or `discarded`, never `not_available`.

## `ways`

`{ "cheapest": { "row": "r2", "total": 1840.5 }, "best_value": { "row": "r4", "total": 2115 }, "different": {
"row": "r5", "total": 2390, "lever": "other_zone", "why": "the only row in the zone where most of the places they
asked for are" } }`

A `why` of another kind, for `other_lodging`: `the only row with a pool to swim in, which this traveller said they
like`.

- `cheapest`: the row marked `cheapest` in the table, with its `total`, copied.
- `best_value`: the row marked `best_value`, with its `total`, copied.
- `different`: a row that is not discarded and is neither of the other two, with its `total`, copied; `lever` is
  `other_lodging` or `other_zone`; `why` says what it changes. Or the string `"none"`.

If the table marks no `cheapest` or no `best_value`, that way is the string `"none"`.

## An entry of `tell`

`{ "lever_row": "l3", "saves": 64, "why": "the same room for less by leaving a day earlier" }`

`{ "lever_row": "l7", "saves": 9200, "why": "the other zone of the route costs less, for a longer walk to what they
asked for" }`

`lever_row` is a lever row with `status` `priced` and a `saves` greater than zero; `saves` is copied from it.

## An entry of `checks`

`{ "what": "the cheapest row cannot be cancelled", "status": "problem", "refs": ["r2"] }`

`status` is `ok`, `problem` or `unknown`. `refs` are row ids or lever row ids of the table; they may be empty.

## An entry of `requests`

`{ "lever": "shift_dates", "row": "r2", "days": -1 }` or `{ "lever": "nights", "row": "r4", "nights": -1 }`

- `lever`: `shift_dates` or `nights`.
- `row`: a row of the table that is not discarded.
- `days`: for `shift_dates`, one of `-3`, `-2`, `-1`, `1`, `2`, `3`: how many days the whole stay moves.
- `nights`: for `nights`, `-1` or `1`: one night less or one night more, at the end of the stay.

Six requests at most. Do not ask for what the table already has.
