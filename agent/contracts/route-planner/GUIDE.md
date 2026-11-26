# The route planner: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read what the traveller comes for

From `in/trip.json`, note what they are looking for, their pace, who travels, and every taste and limit with its
words. Note the kind of destination and how many nights there are, from `in/days.json`. Read `in/warnings.json`: a
warning may move a base or a day.

## 2. See where things are

Go through `in/places.json` and note which places matter for this traveller, and where they sit: which ones are close
together and which ones stand apart. You do not measure: you note what the positions show, and the house computes
every distance afterwards.

## 3. Decide the shape

- `single_base`: everything is done from one place.
- `base_with_day_trips`: one place to sleep, and one or more days out and back.
- `route`: several bases, slept in one after another.

No shape is the usual one: it follows from where the places this traveller cares about sit and from the nights
there are, whatever the kind of destination and however long the trip. The one exception: when `moving.several_places`
is `false`, the traveller wants to sleep in one place. Then the shape is `single_base` or `base_with_day_trips`, with
what fits from that place; what does not fit goes to `left_out`, with why. The house checks it.

Fewer bases is better: every change of base costs half a day. If what the traveller wants does not fit in the nights
there are, leave places out and say which ones in `left_out`. Do not squeeze.

## 4. Give each base its nights, and put the bases in order

The nights of the bases must add up to the nights of the trip: the house checks the sum. Order the bases so that
nobody goes back the way they came. Say where the trip starts and where it ends. Between one base and the next there
is a transfer: its duration comes from `in/transfers.json`, by its reference; if it is not there, it is `unknown`.

## 5. Mark where to look for lodging

In each base, mark one to three zones. A zone is where it makes sense to sleep for what this traveller is going to
do. For each zone give:

- `anchors`: one to three places of `in/places.json`, by `id`. The house takes their positions and puts the centre
  of the zone in the middle of them. You never write coordinates.
- `radius_m`: how far around that centre to search, from the allowed values.
- `near`: the places this traveller will go to from there, by `id`, the most important first. The house computes the
  minutes on foot from the centre to each one.
- `why`: what is there, in facts, by the places of `in/places.json`. Not `lively` or `well located`. Two examples
  of the form, of two different kinds of place, so that you copy neither: `between the two museums and the
  botanical garden`, or `where the paths to the two lakes start, next to the visitor centre`.

More than one zone is worth it only when the zones are really different places to sleep: different surroundings,
different things at hand. Two zones that overlap are one zone.

## 6. Say what happened to each must

If a taste of `in/trip.json` has the weight `must` and is about a place or about the route, say in `musts` whether
the route covers it, and where; or why not. Tastes about the lodging itself (its gym, its view) are not yours: the
house crosses them later.

## 7. Self-critique

Before delivering: a day lost to transfers; a different bed every night; the day of arrival counted as a whole day;
a zone described with adjectives; a place named that is not in `in/places.json`.
