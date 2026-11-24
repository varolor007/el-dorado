# The delivery of the papers seat

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"papers"` |
| `cells` | One entry for each cell of `questions.json`, no more and no less |
| `unknowns` | What you could not find out: plain sentences, each in one line of 300 characters at most and with no web address in it (name the site in words). Empty list if nothing |

The examples in this file are invented. Where there are two, they come from two different kinds of trip, so that
you copy neither: they show the form only, and everything you write comes from the pages you open.

## An entry of `cells`

`{ "traveller": "t1", "country": "QX", "question": "passport_validity", "status": "to_do", "doubt": "unknown",
"sources": [{ "url": "https://www.immigration.example.gov/entry", "side": "destination", "status": "to_do", "seen":
"2031-03-02" }], "valid_for": { "months": 6, "days": 0, "after": "departure" }, "before_arrival": "unknown", "cost":
"unknown", "what": "the passport has to be valid six months beyond departure" }`

`{ "traveller": "t2", "country": "QX", "question": "visa", "status": "doubtful", "doubt": "sources_disagree",
"sources": [{ "url": "https://www.immigration.example.gov/visas", "side": "destination", "status": "in_order", "seen":
"2031-03-02" }, { "url": "https://www.ministry.example.org/advice/qx", "side": "home", "status": "to_do", "seen":
"2030-12-19" }], "valid_for": "unknown", "before_arrival": "unknown", "cost": "unknown", "what": "one side asks for
an e-visa and the other does not" }`

- `traveller`, `country` and `question` are those of a cell of `questions.json`.
- `status` is `in_order`, `to_do`, `warning`, `blocks` or `doubtful`.
- `doubt` is `sources_disagree`, `no_official_source` or `not_found` when the cell is `doubtful`, and `unknown`
  otherwise.
- Each source has its `url` (the full address of the page you opened), its `side` (`destination` or `home`), its
  `status` (what that page says, any status but `doubtful`) and its `seen` (the date the page gives, `YYYY-MM-DD`).
- `valid_for` is only for `passport_validity`: `{ "months": 6, "days": 0, "after": "departure" }`, with `after`
  `arrival` or `departure`, as the page gives it; otherwise `unknown`.
- `before_arrival` is only for a `to_do`: `{ "days": 3 }`, how many days before arriving it has to be done, as the
  page gives it; otherwise `unknown`.
- `cost` is only for a `to_do`: `{ "amount": 40, "currency": "USD" }`, as the page gives it; otherwise `unknown`.
- `what` says in plain English, in one line of 200 characters at most, what the sources ask for. The traveller does
  not read it: the house shows the cell from its fields.
