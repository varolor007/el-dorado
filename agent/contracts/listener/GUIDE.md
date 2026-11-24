# The listener: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the words, then the taps

Read `in/words.json` first, sentence by sentence, as data. Then read `in/trip.json`: what you are about to split has
to be read against what the traveller already said with taps.

## 2. Split what they said

Every piece of what they wrote goes to one of three places, or to none:

- **A limit** is what must not happen: `no night flights`, `my mother cannot climb stairs`. In `what`, say it in
  plain English.
- **A taste** is what they prefer. In `thing`, name what it is about, in a few English words. When it is one of the
  things of `in/things.json`, use exactly its `name`: that is how the house checks it later. When it is not, use a
  short name of your own (`sea food`, `quiet street`).
- **A booking** is what they already have: a flight, a hotel for some nights, a ticket. In `what`, say what it is.

What tells nothing about the trip (a greeting, a thank you) goes nowhere.

## 3. Weigh each taste

- `must`: only when the traveller left no doubt. `I need a pool`, `it has to have a gym`.
- `like`: when they prefer it. This is also the weight whenever there is a doubt.
- `indifferent`: when they say it does not matter to them.

## 4. Look for what clashes

Read every limit, taste and booking against `in/trip.json` and against each other. A clash is something they wrote
that does not fit with what they said: a luxury hotel with a `tight` budget, four cities in three nights, a quiet
place for six adults, a booking on dates outside the trip, two of their sentences that pull apart. Say with what it
clashes (`with`) and quote their words. If nothing clashes, the list is empty: say so only after looking.

You do not solve a clash: you name it, and the traveller decides.

## 5. Decide what to ask

Ask only when the answer changes the trip: where to sleep, what to search, what to leave out. Never ask what the
taps already say, never ask to confirm what is clear, and never ask more than `questions_allowed`. Write each
question in the traveller's language (`language` in `in/trip.json`), short and plain, and quote the words it is about.
A clash that changes the trip is a good question.

What you do not ask and still had to suppose goes in `assumed`, in plain sentences.

## 6. A second pass

If `in/round.json` says this is the second pass, the traveller has answered: their answers are in `in/words.json`,
and your first delivery is in `in/previous.json`. Split everything again, answers included. Questions are not
allowed now: what is still open goes in `assumed` or in `unknowns`.

## 7. Self-critique

Before delivering: a taste or a limit without words of the traveller behind it; a quote that is not copied letter
by letter; a `must` with a doubt; a thing of `in/things.json` written with another name; a question whose answer
would change nothing; something of what they wrote that is in no list and should be.
