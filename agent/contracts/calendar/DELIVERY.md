# The delivery of the calendar seat

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"calendar"` |
| `findings` | What matters in the weeks of the trip, `findings_allowed` at most. Empty list if nothing |
| `windows` | Other dates, `windows_allowed` at most. Empty list if none, and always when the dates cannot move |
| `unknowns` | What you could not find out or left out, in plain sentences. Empty list if nothing |

The examples in this file are invented. Where there are two, they come from two different kinds of trip, so that
you copy neither: they show the form only, and everything you write comes from the pages you open.

## An entry of `findings`

`{ "kind": "raises", "topic": "festival", "name": "Harbour Lights Week", "from": "2031-07-04", "to": "2031-07-09",
"price": "unknown", "what": "the town fills up for a week-long festival", "source":
"https://www.example.org/harbour-lights", "seen": "2031-02-11" }`

`{ "kind": "bothers", "topic": "weather", "name": "unknown", "from": "2031-11-01", "to": "2031-11-30", "price":
"unknown", "what": "it rains on most days of the month", "source": "https://weather.example.net/climate/valley",
"seen": "unknown" }`

- `kind` is `blocks`, `raises`, `bothers` or `favours`.
- `topic` is `weather`, `season`, `festival`, `event`, `public_holiday`, `holiday_at_home` (a holiday where the
  traveller leaves from), `closure`, `sells_out` or `days_needed`.
- `name` is the proper name the page gives, 80 characters at most, or `unknown`.
- `from` and `to` are the first and the last day the page gives, `YYYY-MM-DD`. Only `days_needed` has them
  `unknown`, and only it has `days`: the number of days the page says the destination asks for.
- `price` is `unknown`, or `{ "amount": 120, "currency": "EUR" }` as the page gives it (RC5).
- `what` says in plain English, in one line of 200 characters at most, what the finding is. The traveller does not
  read it: the house shows the finding from its fields.
- `source` is the full address of the page you opened; `seen` is the date that page gives for it, or `unknown`.

## An entry of `windows`

`{ "check_in": "2031-07-11", "because": [0] }`

`check_in` is the day the window would start; the house keeps the same nights. `because` holds the positions, in
`findings`, of the findings that move you to propose it, starting at 0.
