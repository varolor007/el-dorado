# The getting-around seat: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the trip

Read `in/trip.json`, `in/route.json` and `in/limits.json`. Write in your plan, in this order, what you will look for:
how to get from where they arrive to each base; what transport serves each zone; the tickets and passes, how they are
paid for and the hours; and, if the route has more than one base or goes round a region, whether a car is needed and
how to go from one base to the next. If `arrival` is `unknown`, look for the main airport, station or port of the
destination, and say in `unknowns` that the house did not know where the traveller arrives.

## 2. Look, one thing at a time

Search for each thing, open the page of whoever runs it and write a note from that page, with its address. A search
result alone is not a note (W4). When two pages give different fares, write both and keep the one of the operator
(W5). A place with no public transport is a fact too: write it, with the page that says it.

## 3. From where they arrive to where they sleep

For each base, each way the pages give from the airport, the station or the port to its zones: the mode, the minutes
the page gives, its fares and until what time it runs. A taxi counts only with a fare the airport or the city
publishes; otherwise its price is `unknown`. If you find no way at all, `arrivals` is empty and `no_arrival` says why.

## 4. Getting around there

For each mode of transport that serves the zones of the route, the zones it serves and until what time it runs. Then
the tickets: a single, a day pass, a pass of several days, a pack of several rides or a card you top up, each with
what it covers and its fares, for adults and, if the page gives them, for children with their ages. Then how they are
paid for: contactless, a card, cash, an app or a local travel card.

## 5. A region, or more than one base

If the trip goes round a region, whether a car is needed (`car_needed`), from a page that says it; if no page says it,
`unknown`. If the route has more than one base, how to go from each base to the next, with the minutes and the fares
the pages give (`between_bases`). With one base, `between_bases` is empty.

## 6. Self-critique

Before delivering: a fact without a page opened; a price without its currency, or one you converted; a number you
worked out, or a range written as a price; a word that picks the best way; a zone that is not of the route; no way
from where they arrive, and no reason why; a number in `unknowns` that is not in your data.
