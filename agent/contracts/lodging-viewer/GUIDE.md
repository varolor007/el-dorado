# The lodging viewer: step by step

The steps below are your steps 3 to 5 of the common method. Look first, judge afterwards.

## 1. Inventory the photos

Open every file in `in/photos/` and note, for each one, what it shows: `room`, `bathroom`, `view`, `gym`, `pool`,
`common` (lobby, corridors, terrace, bar), `food`, `exterior` or `other`. All of them are official photos: they show
the lodging at its best, shot wide. Keep that in mind when you judge size.


## 2. Look by checklist, without judging yet

For each photo, note what is there, thing by thing.

- **The room** (`room-NN` photos only): the floor and the walls; the furniture and its edges; the bedding; the
  screen; the air conditioning; sockets by the bed; the window and what is seen through it; and how much free floor
  there is around the bed.
- **The bathroom**: a walk-in shower with a glass screen or a bathtub with a curtain; the taps; the joints and the
  sealant; the washbasin and its counter.
- **The gym**: how many machines you can count and of what kind (treadmills, bikes, ellipticals); free weights, a
  bench, a rack or cable machines; whether the machines look current or worn; natural light or a basement.
- **The pool**: its size, using people, loungers or doors as a measure; indoor or outdoor; the state of the basin and
  of what surrounds it.

Count, do not estimate. Write `three treadmills and one bike`, not `a decent gym`.

## 3. Read the reviews by theme

Go through `in/reviews.json` and note what guests say about the room, its size, noise, cleanliness, the bathroom, the
view, the gym, the pool, whether the place feels new or tired, what guests found dirty, broken or left unrepaired,
and any other theme of the list in `contract/DELIVERY.md` that they bring up. For each theme note whether one, a few
or several reviews mention it, whether for good or for bad, how recent they are, and the references of the clearest
ones. Read the complaints with care: what is repeated matters; one isolated complaint does not.

Look for serious complaints: pests, mould, something stolen, a scam, or a guest who did not feel safe. Some reviews
carry a `flag`: the house found a word there that may be one of them. A flag is a place to look, not a verdict:
read the review and decide whether the guest reports it as something that happened to them. Read the reviews
without a flag too, above all those in a language the house may not have recognised. What you confirm goes in
`serious`.

Note apart anything that exists but may not be there for this stay: something that only runs part of the year, a
gym or a lift under works, a service paid apart. The season of the stay is `stay.season` in the sheet: the house
worked it out from where the lodging is, which you do not know. Never deduce a season from the dates: the same
month is winter in one half of the world and summer in the other, and some places have neither. If something you
saw or read depends on the season and `stay.season` is the wrong one for it, raise a warning labelled `deduced`,
not a fact, and cite `stay.season`. If `stay.season` is `unknown`, raise no warning about the season: only what a
review or the sheet says outright, labelled `seen`.

## 4. Give each field its level

For each field of `DELIVERY.md`, choose one level from its list, from your notes, and attach the evidence that
supports it: the photo, the review or the line of the sheet. If you have no evidence, the level is `unknown`. A
service that the sheet lists but that no photo and no review shows is `unknown`, not an average level.

The room's size comes from the sheet when the sheet gives it; in the photos you count what fits.

## 5. Cross the photos with the reviews

How the room looks and how the place is kept are two different things, and each has its field. `look` follows the
photos of the room. `upkeep` follows what recent guests report about cleanliness and maintenance. A room that looks
new in its photos and that several recent guests found dirty is `new_or_renovated` and `neglected`: both are true,
and you record the disagreement in `conflicts`.

For every other field, where the photos and the reviews disagree, the recent reviews win: the level follows them, and
you record the disagreement in `conflicts`.

## 6. Self-critique

Before delivering: is any level resting on an impression instead of a note? Did a well-shot photo make you generous?
Did you judge a room field from a photo that is not of this room? Is everything you could not see marked `unknown`?
