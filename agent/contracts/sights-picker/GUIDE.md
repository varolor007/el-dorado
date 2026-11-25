# The sights picker: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read who travels and what they come for

From `in/trip.json`, note what they are looking for, who travels (children, their ages), their pace, and every taste
and limit with its words. From `in/days.json`, note how many nights there are. From `in/warnings.json`, note what
may close or crowd a place on those dates.

## 2. Go through every sight

For each place of `in/sights.json`, note what it is and what it offers, from its `kind` and its `about`. One note
per place, with its id. Popularity tells you how much the world writes about a place; it does not tell you whether
this traveller cares.

## 3. Decide: go or skip

Every place of the list gets a verdict.

- `go`: it is worth this traveller's time, for what they said they are looking for.
- `skip`: it is not, for this traveller or for the nights there are. Say why with a fact, not with `not
  interesting`. Two examples of the form, of two different kinds of place, so that you copy neither: `an office
  building that is not open to visitors`, or `a summit that its description gives as a full day of climbing`.

How much a trip can hold depends on its nights: one night holds little and three weeks hold a lot. Choosing is
your job either way: a `go` list as long as the whole list helps nobody.

## 4. Order what is worth it, and say how long it takes

Put the `go` list in order of importance for this traveller: the first ones are the ones they should not miss. For
each one give:

- `minutes`: how long the visit itself takes, from the allowed values. A square takes less than a large museum, and
  a viewpoint by the road less than a marked path. It is your judgement from the kind of place: label its note
  `assumed`.
- `best_time`: `morning`, `afternoon`, `evening` or `any`, when the kind of place or its `about` gives a reason:
  for instance a path that takes most of a day, in the morning, or a quarter that its `about` gives as a place to
  go at night, in the evening. Otherwise `any`.
- `book_ahead`: `yes` or `no` only if the material says so; otherwise `unknown`.
- `must`: `true` only for what this trip cannot do without. It is rare.

## 5. Say what is missing

If a traveller with these wishes would expect something that the list does not have, say it in `missing`, by what
it is: for instance somewhere to swim, a place with live music or an easy walk for small children. You do not name
a place that is not in the list and you do not add it to `go`. Today the house keeps what you say is missing but
does not yet look for it in other sources: it is not added to the trip.

## 6. When there is a message

If `in/message.json` exists, the traveller already has these days and asks for a change in their words: «fewer
museums», «a beach day», «something calmer on the second day». You do the same job as above, over the whole list,
with what they said as one more thing they want:

- Read `said` as a wish about what is worth their time, next to what `in/trip.json` says. It does not erase their
  tastes and limits: it adds to them or weighs over them where they clash.
- Every place of `in/sights.json` gets its verdict again. What they ask for less of goes down the `go` list or to
  `skip`; what they ask for more of goes up, if the list has it. Places in `new_sights` were found for this message:
  judge them like any other.
- Every `id` in `removed` goes to `skip`: the traveller took it out by hand, and it does not come back on its own.
- You still do not put anything on a day: `open_day` and `days` tell you what the traveller was looking at, not
  where things go. The house spreads your choice over the days again.
- In `changed`, tell the traveller what changed and why, in one to three plain sentences, in their language: what
  you took out, what you brought in and what moved up, each with the reason from what they said. If what they asked
  for is not in the list, say so plainly, and put it in `missing` too.

## 7. Self-critique

Before delivering: a `go` chosen for its fame and not for this traveller; a `why` that would fit any place; a place
with two verdicts or with none; something you know from memory that is not in `in/`.
