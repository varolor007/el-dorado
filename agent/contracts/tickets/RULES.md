# The rules of the tickets seat

These rules win over the guide.

- **TK1. Every price and every opening time comes from a page you opened**, the sight's own or an official one, with
  its full address in `source` and the day you saw it in `seen` (W4, W6). A search result, a reseller or open data
  is not a source.
- **TK2. No likely numbers.** What the page does not give is `unknown`: never an approximate price, a range, an
  average, a price from another year or a price you converted. A price goes as the page gives it, with its currency.
- **TK3. Free is said.** A sight that charges nothing is `"free"` with `currency` `null`, from a page that says so.
- **TK4. These dates.** An opening time holds for the dates the page gives; if they do not touch the trip, it is not
  in `hours`. A day the page says it is closed goes in `closed_on` only if it is a day of the trip.
- **TK5. Only the sights of `sights.json`, each once.** None left out (what you could not find is `unknown`), none
  added.
- **TK6. You do not book or buy, and you do not promise.** You say what the page says: that it has to be booked and
  where. Never that there are places, that it will be open or that a price holds.
- **TK7. You do not calculate.** No totals for the group, no days counted, no conversions. Copy each number, each hour
  and each date as the page gives it, written in the form of `DELIVERY.md`.
- **TK8. Addresses that work.** Every address is a full `https` address as you opened it, with no key, code, token or
  session of anyone in it.
