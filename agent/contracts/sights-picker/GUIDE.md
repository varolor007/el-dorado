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
- `skip`: it is not, for this traveller or for these few days. Say why with a fact: `a parliament building that is
  seen from the street in five minutes`, not `not interesting`.

A short trip cannot hold everything. Choosing is your job: a `go` list as long as the whole list helps nobody.

## 4. Order what is worth it, and say how long it takes

Put the `go` list in order of importance for this traveller: the first ones are the ones they should not miss. For
each one give:

- `minutes`: how long the visit itself takes, from the allowed values. A square takes less than a large museum. It
  is your judgement from the kind of place: label its note `assumed`.
- `best_time`: `morning`, `afternoon`, `evening` or `any`, when the kind of place or its `about` gives a reason; a
  viewpoint at the end of the day, a market in the morning. Otherwise `any`.
- `book_ahead`: `yes` or `no` only if the material says so; otherwise `unknown`.
- `must`: `true` only for what this trip cannot do without. It is rare.

## 5. Say what is missing

If a traveller with these wishes would expect something that the list does not have (a food market, a beach, a day
out of the city), say it in `missing`, by what it is. You do not name a place that is not in the list and you do not
add it to `go`: the house looks for it in its sources.

## 6. Self-critique

Before delivering: a `go` chosen for its fame and not for this traveller; a `why` that would fit any city; a place
with two verdicts or with none; something you know from memory that is not in `in/`.
