# The rules of the getting-around seat

These rules win over the guide.

- **RM1. Every way, every ticket and every price comes from a page you opened**, with its full address in `source`
  (W4). A fact without a page you opened is not a fact: it is `unknown`. Prefer the page of whoever runs the transport
  or an official one (W5).
- **RM2. Every price carries its currency and its day.** `amount` is the number the page gives, in `currency`, the
  three letters of that currency; `seen` is `today`, the day you opened the page. You never convert a price.
- **RM3. What you do not find is `unknown`, never an approximate number.** No "about", no ranges, no average, no
  number worked out from another. A price of zero is `"free"`, and only if the page says it is free. If the page gives
  only a range, the price is `unknown`, and you say in `unknowns`, in words, which price you could not find.
- **RM4. You do not say which way is best.** No word that picks one: best, better, cheapest, fastest, recommended,
  worth it, should. You give each way and each ticket with its data; the house works out what suits the traveller's
  days. You promise nothing: a fare is what the page said on the day you saw it.
- **RM5. At least one way to go from where they arrive to where they sleep**, for each base if you can, or
  `no_arrival` says why there is none: `not_found` (you looked and found none) or `no_public_way` (the pages you
  opened say there is no way without a car or a taxi you could price).
- **RM6. Only the zones of the route**, by their `id` in `route.json`. A way to a place that is not a zone of the
  route is not in your delivery.
- **RM7. Every number in a sentence is in your data.** A sentence in `unknowns` may name a number only if the same
  number is in a field of your delivery; better, say it in words without the number.
- **RM8. A proper name is copied, not made up.** The name of an airport, a station or a port goes in `name` as the
  page writes it, 80 characters at most, without an address, a phone number or an email; its code, if the page gives
  it, in `code`.
- **RM9. You do not calculate.** No sums, no prices per day, no comparisons of passes against singles. Copy each
  number as the page gives it.
