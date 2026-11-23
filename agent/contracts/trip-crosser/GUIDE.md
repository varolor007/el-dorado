# The trip crosser: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the table

Note each row: its lodging, its zone, its total, its score, what is unconfirmed, the walk and whether it can be
cancelled. Note which row the house marked `cheapest` and which `best_value`, and which rows were discarded and why.
A discarded row is out: it is never a way.

## 2. See where the money is, and where it moves

Read the lever rows. For each one note what changes, what it saves and what it costs in exchange: a longer walk, a
lower score, other dates, one night less. Note which changes move the total a lot and which hardly move it. Note
the ones with no price, and why.

## 3. Go through the fixed list of levers, one by one

For every lever of `in/levers.json`, give its status:

- `tested`: the table has lever rows for it. Name them.
- `discarded`: it could be tried and it is not worth it or must not be done, with the reason in facts: it breaks a
  must of the traveller, the traveller said the dates are fixed and it saves little, the saving is negative.
- `not_available`: the house cannot price it today. The reason is in `in/levers.json` or in the `notes` of the
  table.

None is left out.

## 4. Look at what the table does not see

The table adds and subtracts; it does not look at whether the pieces fit. Check, and note in `checks`:

- whether the cheapest row can be cancelled, and what is lost if it cannot;
- whether a row carries something `unconfirmed` that matters to this traveller, above all a must;
- whether a lodging has a warning for these dates (`in/lodgings.json`);
- whether moved dates fall on a weekday or on a warning that changes the trip;
- whether the arrival fits the check-in. Without transport times in the table, this is `unknown`: say so.

## 5. Decide whether to ask for more

Only in round 1, and only if the answer could change which row is cheapest or best value, or uncover a saving worth
telling. Each request names a lever the house can price, the row and how much to move. If nothing could change the
result, ask for nothing: that is a good answer.

## 6. Close the three ways

- `cheapest`: the row the house marked `cheapest`. You do not choose it.
- `best_value`: the row the house marked `best_value`. You do not choose it.
- `different`: your choice. Another row of the table that gives this traveller a real alternative, told apart by a
  lever with a name: another lodging, another zone. Say what it changes for this traveller, with the numbers of the
  table. If no other row is a real alternative, the value is `"none"`, and you say why in `unknowns`.

The three ways are for the traveller's dates and group. A change of dates is never a way: it is a lever to tell.

## 7. Choose what to tell

From the lever rows with a price, choose the ones worth telling this traveller, the most useful first: a real
saving, or little money for a clear gain. Leave out the ones that save next to nothing and the ones that break
what the traveller asked for. For each one say why it is worth telling, in facts.

## 8. Self-critique

Before delivering: a number that is not in the table; a way built from two rows; a lever without its status; a
saving told that the traveller cannot use; a request that could not change anything.
