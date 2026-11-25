# The guide writer: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. See who you are writing for

From `in/trip.json`, note who travels, what they are looking for in their own words and their pace. What matters to
them goes first in every text you write.

## 2. Note the facts of each stop

For each stop of `in/days.json`, note what `about` says it is, `why` it is in the trip, its `minutes`, its
`best_time`, whether to book ahead and whether it is not to be missed, each with where it comes from. If `about` is
`unknown`, the only facts you have are its name, its kind and its `why`: you write with those, and no more.

## 3. Write each day

For each day, a `title` and an `intro`: what the day is, in one or two sentences, by its stops. Then, for each stop,
three short texts:

- `what`: what it is, for someone who has never heard of it, from `about` and its kind.
- `why`: why they go, for this traveller.
- `when`: when it is best to go, from `best_time`, and what to know before going in: if it is booked ahead, say so.
  If `best_time` is `any`, say that any time of the day suits it, or what the material says. If the stop has its
  `ticket`, you may say it is free, or that it is closed that day (`open_that_day` is `no`), or the hours it opens
  that day: only as the material gives them.

A free day (`free` is `true`) has no stops: its `title` says in a few words that the day is theirs, and its `intro`,
in one or two sentences, what kind of day it is in the trip (the day they arrive, the day they leave, a day between
two others), by its date and from what your material says. You do not fill it: no stop of another day, no place,
no plan that is not in your material. If it has `eat`, you write it as on any other day.

Two examples of the form of a `what`, in English and of two different kinds, so that you copy neither:
`A covered market from the end of the nineteenth century, where the stalls of the town still sell fish and fruit.`,
or `The hill of the old castle: from its walls the whole bay is seen.` Yours come only from your material.

## 4. Write each walk

For each leg of each day, one sentence (`says`): how they go from one point to the next, with its minutes and its
metres as the material gives them. If `on_foot` is `false`, they are minutes by car or public transport and an
estimate: say about that many minutes, never on foot. If `measured_by` is `estimate`, say the minutes are
approximate. What they see on the way is what the two points are: you do not invent streets, views or places in
between. Two examples of the form: `From the market to the castle, <minutes> minutes uphill on foot, <metres>
metres.`, or `About <minutes> minutes by car or public transport: the castle is out of town.`
If `on_foot` is `false` and you have `in/around.json`, you may say which of its `transport` modes there are to go:
only those. Without it, you name no bus, metro, tram or train.

## 4b. Write where to eat

For each day that has `eat`, one or two sentences (`eat`): where to stop and eat that day, by its places, near which
stop and how many metres away, as the material gives them. The places are areas and markets, never a restaurant: if
the material has no name for a place, say what it is without a name.

## 5. Write what to have done

For each entry of `in/todo.json`, one sentence (`says`): what the traveller has to do, and by when if the entry has
a deadline. A paper is told as the official sources ask for it: you never say that they meet it, nor that they can
enter.

## 6. The cover and what is not known

A `title` for the cover (the trip in a few words) and an `intro` of one or two sentences: what kind of trip it is,
by its days. In `unknowns`, what the traveller should know is missing: stops without `about`, legs that are
estimates, a deadline that is `unknown`. Plainly, in their language.

## 7. Self-critique

Before delivering: a place that is not a stop of the trip or of your material; a number that is not in the material;
a clock time or a price that is not in the material; a restaurant; a transport mode that is not in `in/around.json`; a
promise; a word from inside; an adjective without its fact; a stop, a leg, a day with `eat` or a thing to do without
its text; an `eat` on a day without it; a stop, a leg or a place on a free day.
