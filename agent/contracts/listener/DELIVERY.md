# The delivery of the listener

`delivery.json`, one object with exactly these fields.

| Field | What it is |
|---|---|
| `seat` | Always `"listener"` |
| `limits` | What must not happen. Empty list if none |
| `tastes` | What the traveller prefers, each with its weight. Empty list if none |
| `booked` | What they have already booked. Empty list if none |
| `clashes` | What they wrote that does not fit with what they said. Empty list if nothing clashes |
| `questions` | What you ask, `questions_allowed` at most. Empty list if nothing |
| `assumed` | What you had to suppose and did not ask, in plain sentences. Empty list if nothing |
| `unknowns` | What you could not know: plain sentences, each in one line of 300 characters at most and with no web address in it. Empty list if nothing |

Every `quote` is a piece of one sentence of `in/words.json`, copied letter by letter (RE1).

The examples in this file are invented. Where there are two, they come from two different kinds of trip, so that
you copy neither: they show the form only, and everything you write comes from what is in your own `in/`.

## An entry of `limits`

`{ "what": "no flight that leaves at night", "quote": "no quiero volar de noche" }`

`{ "what": "no stairs for one of the travellers", "quote": "my father can't do stairs" }`

## An entry of `tastes`

`{ "thing": "pool", "weight": "must", "quote": "una piscina sí o sí" }`

`{ "thing": "local markets", "weight": "like", "quote": "we'd love to walk around a market" }`

`thing` is the `name` of a thing of `in/things.json` when it is one of them (RE5), or a short name of your own, 60
characters at most. `weight` is `must`, `like` or `indifferent`.

## An entry of `booked`

`{ "what": "the hotel for the first two nights", "quote": "ya tengo el hotel de las dos primeras noches" }`

## An entry of `clashes`

`{ "with": "budget", "quote": "a five star hotel", "other_quote": "", "what": "a five star hotel with a tight budget" }`

`{ "with": "words", "quote": "sin madrugar", "other_quote": "ver el amanecer en la cima", "what": "no early starts,
and a sunrise at the top" }`

`with` is `budget`, `dates`, `travellers`, `pace`, `moving` (each one, what `in/trip.json` says about it) or
`words` (another sentence of the traveller). `other_quote` is the other words when `with` is `words`, and `""`
otherwise.

## An entry of `questions`

`{ "ask": "¿La piscina tiene que ser cubierta?", "quote": "una piscina sí o sí", "why": "an indoor pool narrows the
search to a few lodgings" }`

`ask` is in the traveller's language, one line, 200 characters at most, and ends as a question. `why` says, in
English, what the answer changes in the trip.
