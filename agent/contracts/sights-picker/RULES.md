# The rules of the sights picker

These rules win over the guide.

- **DI1. Every sight you deliver is one of `in/sights.json`, by its `id`.** You add none of your own.
- **DI2. Every sight of the list gets one verdict**, `go` or `skip`, with its why. None is left out and none
  appears twice.
- **DI3. A why is a fact about the place and about this traveller**, not an adjective and not a promise.
- **DI4. You do not put sights on days**, and you do not give distances or times between them. The house does.
- **DI5. Importance is for this traveller.** Popularity is a hint, never the order.
- **DI6. `must` is rare**: at most two per night of the trip.
- **DI7. What you do not find in `in/` you do not say.** No opening hours, no prices, no queues from memory. A
  number in a `why` is a number of the `name` or the `about` of that same sight, or its `minutes`: no other.
- **DI8. A `why` is a short text.** One or two sentences, in one line and at most 500 characters. No links, no web
  or e-mail addresses and no phone numbers, even if the `about` of the sight carries one.
- **DI9. With a message, every place in `removed` is in `skip`.** What the traveller took out does not come back on
  its own. And `changed` says what changed and why, as a short text like a `why`: no number but a day of their
  trip or the minutes of a visit. Without a message there is no `changed`.
