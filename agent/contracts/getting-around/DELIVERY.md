# The delivery of the getting-around seat

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"getting-around"` |
| `arrivals` | Each way from where they arrive to a zone of the route, `arrivals` of `limits.json` at most. Empty list if none, and then `no_arrival` says why |
| `no_arrival` | `null` if there is a way in `arrivals`; if there is none, `not_found` or `no_public_way` (RM5) |
| `transport` | Each mode that serves zones of the route. Empty list if none |
| `tickets` | Each ticket or pass, with its fares. Empty list if none found |
| `payment` | How the transport is paid for. Empty list if no page says it |
| `car_needed` | Whether a car is needed to go round, from a page; or `unknown` |
| `between_bases` | How to go from one base to the next. Empty list with one base |
| `unknowns` | What you could not find out: plain sentences, each in one line of 300 characters at most, with no web address in it (name the site in words) and no word that picks the best way. Empty list if nothing |

The examples in this file are invented. Where there are two, they come from two different kinds of trip, so that
you copy neither: they show the form only, and everything you write comes from the pages you open.

## A price

`{ "for": "adult", "ages": null, "amount": 2.4, "currency": "EUR", "source": "https://transit.example.org/fares",
"seen": "2031-02-11" }`

`{ "for": "child", "ages": { "from": 6, "to": 11 }, "amount": "free", "currency": null, "source":
"https://www.example-island.gov/ferries/fares", "seen": "2031-02-11" }`

- `for` is `any`, `adult`, `child`, `infant`, `youth`, `student`, `senior`, `family` or `group`: the closest to what
  the page says. `ages` is `{ "from": 6, "to": 11 }` if the page gives the ages (either may be `null`), or `null`.
- `amount` is the number the page gives, more than zero, or `"free"`. `currency` is its three letters, or `null` only
  when it is free.
- `source` is the full address of the page you opened; `seen` is `today`.
- A list of prices that you could not find is `"unknown"`, never an empty list.

## An entry of `arrivals`

`{ "from": { "kind": "airport", "code": "XAA", "name": "Example International" }, "to_zone": "z1", "mode": "train",
"minutes": 25, "prices": [ <a price> ], "until": "23:40", "source": "https://www.example-airport.org/to-the-city",
"seen": "2031-02-11" }`

- `from.kind` is `airport`, `station` or `port`; `code` is the code the page gives (three capital letters for an
  airport) or `unknown`; `name` is its name as the page writes it, or `unknown`.
- `to_zone` is the `id` of a zone of `route.json`.
- `mode` is `metro`, `tram`, `bus`, `train`, `ferry`, `cable`, `shuttle`, `taxi`, `ride_hailing`, `car`, `bike` or
  `walk`.
- `minutes` is the number of minutes the page gives, or `unknown`. `prices` is a list of prices, or `unknown`.
- `until` is the time of the last one, `HH:MM`, `24:00` if it runs all night, or `unknown`.

## An entry of `transport`

`{ "mode": "bus", "zones": ["z1", "z2"], "until": "00:30", "source": "https://transit.example.org/network", "seen":
"2031-02-11" }`

## An entry of `tickets`

`{ "kind": "day_pass", "days": 1, "rides": null, "modes": ["metro", "bus", "tram"], "prices": [ <a price> ], "source":
"https://transit.example.org/fares", "seen": "2031-02-11" }`

- `kind` is `single` (one ride), `day_pass` (one day), `multi_day_pass` (two days or more), `multi_ride` (a pack of
  several rides) or `travel_card` (a card you top up).
- `days` is how many days a pass is valid: 1 for a `day_pass`, 2 or more for a `multi_day_pass`, `null` for the rest.
  `rides` is how many rides a `multi_ride` gives (2 or more), 1 or `null` for a `single`, `null` for the rest.
- `modes` is the modes it covers, at least one, from the list of `mode`.
- `prices` is a list of prices, or `unknown`. A ticket whose price you did not find is still a ticket.

## An entry of `payment`

`{ "kind": "contactless", "source": "https://transit.example.org/how-to-pay", "seen": "2031-02-11" }`

`kind` is `contactless`, `card`, `cash`, `app` or `travel_card`.

## `car_needed`

`{ "needed": true, "source": "https://www.example-region.gov/visit/getting-around", "seen": "2031-02-11" }`, or
`"unknown"`.

## An entry of `between_bases`

`{ "from_base": "b1", "to_base": "b2", "mode": "train", "minutes": 95, "prices": "unknown", "source":
"https://rail.example.org/timetable", "seen": "2031-02-11" }`

`from_base` and `to_base` are `id`s of two different bases of `route.json`.
