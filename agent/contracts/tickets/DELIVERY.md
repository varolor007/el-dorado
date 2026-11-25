# The delivery of the tickets seat

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"tickets"` |
| `sights` | One entry for each sight of `sights.json`, no more and no less, each once |
| `unknowns` | What you could not find out or left unchecked: plain sentences, each in one line of 300 characters at most and with no web address in it (name the site in words). Empty list if nothing |

The examples in this file are invented. Where there are two, they come from two different kinds of sight, so that
you copy neither: they show the form only, and everything you write comes from the pages you open.

## An entry of `sights`

`{ "id": "Q1000001", "prices": [{ "for": "adult", "ages": null, "amount": 14, "currency": "QXD", "source":
"https://www.museum.example.org/visit", "seen": "2031-02-11" }, { "for": "child", "ages": { "from": null, "to": 17 },
"amount": "free", "currency": null, "source": "https://www.museum.example.org/visit", "seen": "2031-02-11" }],
"hours": [{ "from": "unknown", "to": "unknown", "open": [{ "days": ["tue", "wed", "thu", "fri", "sat", "sun"],
"opens": "10:00", "closes": "18:00" }], "closed_on": ["2031-03-14"], "source": "https://www.museum.example.org/visit",
"seen": "2031-02-11" }], "booking": { "needed": true, "where": "https://tickets.museum.example.org/", "source":
"https://www.museum.example.org/visit", "seen": "2031-02-11" }, "official_site": "https://www.museum.example.org/" }`

`{ "id": "Q2000002", "prices": [{ "for": "any", "ages": null, "amount": "free", "currency": null, "source":
"https://www.parks.example.gov/lookout", "seen": "2031-06-30" }], "hours": "unknown", "booking": "unknown",
"official_site": "unknown" }`

- `id` is the `id` of a sight of `sights.json`.
- `prices` is `unknown`, or a list with one entry for each kind of ticket the page gives for this group:
  - `for` is `any`, `adult`, `child`, `infant`, `youth`, `student`, `senior`, `family` or `group`: the closest to what
    the page says;
  - `ages` is `null`, or `{ "from": 6, "to": 17 }` as the page gives them, each a whole number or `null` when the page
    gives no limit on that side;
  - `amount` is the number the page gives, for one person of that kind (or for the family or group ticket), or
    `"free"`;
  - `currency` is the currency the page gives, in its three capital letters, and `null` when the amount is `"free"`.
- `hours` is `unknown`, or a list of opening times, each for the dates the page gives:
  - `from` and `to` are the first and last day it holds for, `YYYY-MM-DD`, or `unknown` when the page does not say
    (all year);
  - `open` lists, for each block of hours, the `days` of the week it applies to (`mon`, `tue`, `wed`, `thu`, `fri`,
    `sat`, `sun`) and the hours it `opens` and `closes`, `HH:MM` in twenty-four hours. A day of the week in no block
    is a day it is closed;
  - `closed_on` lists the days of the trip, `YYYY-MM-DD`, on which the page says it is closed although its weekly
    hours say open (a holiday, works, an event). Empty list if none.
- `booking` is `unknown`, or an object with `needed` (`true` or `false`: whether the page says it has to be booked
  ahead), `where` (the address where it is booked, or `unknown`), `source` and `seen`.
- `official_site` is the address of the sight's own site, or `unknown`.
- Every `source` is the full address of the page you opened, and every `seen` the day you saw it, `YYYY-MM-DD`.
