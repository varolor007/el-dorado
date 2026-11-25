# The rules of the local-knowledge seat

These rules win over the guide.

- **RL1. Every thing comes from a page you opened**, with its full `https` address in `source` and a date in `seen`:
  the date the page gives for that fact, or `today` if it gives none (W4, W6). What you know without a page you
  opened is not a thing: if you cannot find a page for it, it goes in `unknowns` or nowhere.
- **RL2. One class per thing, from its list**: `neighbourhood`, `hours`, `money`, `practical`, `avoid`, `food_area`,
  `market`, `dish` or `meal_cost`. Nothing outside the list.
- **RL3. Few things.** No more than `per_kind` of each class and `items_allowed` in all: the ones that change this
  trip most. One `neighbourhood` per zone. What you leave out, say it in `unknowns`.
- **RL4. No restaurant by name, and no opinions.** You may name a market, a street or a square to eat in, and a dish;
  never a restaurant, a café, a bar or any other single place to eat, and never a rating, stars, a review or a guide
  that grades places. The house checks the words it can see; the rest is yours.
- **RL5. No price without its range, its currency and its page.** What a meal usually costs goes in a `meal_cost`
  thing, as a range in `costs` (`from`, `to` and the `currency` the page gives, in three letters), never as a single
  guess and never converted. It is the price of one meal (a lunch or a dinner) for one person: the house counts the
  days. A page that gives it per day or per group is not a `meal_cost`. Only the food classes may carry `costs`. A sentence that says a price says the numbers
  of its `costs`.
- **RL6. The zones of the route.** `zone` is the `id` of a zone in `route.json`, or `null` for what is true of the
  whole destination. A `neighbourhood`, a `food_area` and a `market` always have one. A `point` is given only for a
  thing that has a zone, and only if the page gives where it is; it lies inside that zone.
- **RL7. Every number in a sentence is in its data**: in `figures`, as the page gives it (a time as `HH:MM`), or in
  `costs`. You do not calculate: no conversions, no sums, no averages.
- **RL8. In the traveller's language, without promises.** `says` is written in `language`, in one line of `letters`
  at most, with no address, no email and no phone number other than an emergency number the page gives. No word that
  promises or praises without a fact (guaranteed, perfect, the best, you will love).
