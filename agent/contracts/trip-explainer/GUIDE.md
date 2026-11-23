# The trip explainer: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. See who you are writing for

From `in/trip.json`, note what matters to this traveller: what they are looking for, their tastes with their words,
how much they want to spend. What matters to them goes first in every line you write.

## 2. Note the facts of each way

For each way of `in/ways.json`, note its total, what it costs more than the cheapest, the walk, the score, whether
it can be cancelled, and the two or three facts of the lodging that matter to this traveller, each with where it
comes from. Note what is unconfirmed.

## 3. Write each way

For each way, three short texts in the traveller's language:

- `why`: why this way is this one. One sentence.
- `gains`: what is gained with it compared with the cheapest, in facts and numbers. Two examples of the form, in
  English and of two different kinds, so that you copy neither: `<amount> <currency> more, <minutes> minutes closer
  on foot and a gym with free weights`, or `<amount> <currency> more, a pool to swim in and it can be cancelled`.
  `<amount>` and `<minutes>` are numbers of your material, and `<currency>` is the currency of the trip, from
  `in/ways.json`. For the cheapest itself: what makes it the one to take if money comes first.
- `loses`: what is lost with it. For the cheapest: what the other ways have and it does not.

Only the differences that matter. No adjective without its fact: not `quiet` but `the room looks onto an inner
courtyard`, not `spacious` but `room for a desk besides the bed`; and only if the material says so.

## 4. Write each saving

For each entry of `in/levers.json`, two short texts:

- `what`: what the traveller would do and what it saves. Two examples of the form, in English and of two different
  kinds: `Leaving a day earlier, on the <weekday>, saves <amount> <currency>`, or `Sleeping in <the other zone>
  saves <amount> <currency>`.
- `in_exchange`: what it costs them: other dates, a longer walk, one night less. If it costs nothing that the
  material shows, say that nothing else changes in what was looked at.

## 5. Say what is not known

In `unknowns`, in the traveller's language: what could not be confirmed and matters, and what `in/checks.json`
leaves as `unknown` or as a `problem`. In the same plain voice as the rest.

## 6. Self-critique

Before delivering: a number that is not in the material; a promise; a word from inside; an adjective without its
fact; a way without what it loses.
