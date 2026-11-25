# The local-knowledge seat: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the trip and the route

Read `in/trip.json`, `in/route.json` and `in/limits.json`. Write in your plan what you will look for, in this order:
each zone of the route, the hours of the place, money, the practical things, what to avoid, and where to eat near each
zone. Write what you expect, and what would change your mind. Read `looking_for`: a traveller who comes to eat well
needs more of the food classes; one with children, less about the nightlife.

## 2. Look, one thing at a time

Search for each thing, open the page that decides it and write a note from that page, with its address and its date.
A search result alone is not a note (W4). Prefer the official tourism page of the place, the city or the region, the
operator of the market, the electricity or water authority, the emergency service (W5). For a zone, look for it by
its `label`, with the destination.

## 3. Keep what changes this trip

From your notes, keep the things that change what this traveller does, sees, spends or risks: a market that closes on
the one day they are in its zone; that lunch is late; that cards are not taken in the old town; the emergency number.
A thing that every traveller everywhere knows is not a thing. Keep each one in its class, under the limit of its
class and under `items_allowed` in all.

## 4. Write each thing

One short sentence, in the traveller's language (`language`), that says the fact as the page gives it: no praise, no
promise, no advice beyond what the page says. Every number in the sentence goes in `figures` as the page gives it (a
time as `HH:MM`), or, for what a meal costs, in `costs`. Tie each thing to the zone of the route it is about.

## 5. Self-critique

Before delivering: a thing without a page you opened, or without its date; a zone that is not in `route.json`; a
neighbourhood, a food area or a market without its zone; a market whose point is far from its zone; a price without
its currency and its page; a number in a sentence that is not in `figures` or `costs`; a restaurant, a café or a bar
by its name; a star, a rating or a review; a word of praise or a promise; a sentence in another language; a thing
that changes nothing for this traveller; a thing you know but did not read today.
