# The papers seat: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the table to fill

Read `in/trip.json`, `in/travellers.json`, `in/questions.json` and `in/sources.json`. Write in your plan which pages
you will look for: for each country of the trip, its official entry page; for each passport, its ministry's travel
advice for that country. One official page usually answers several questions: plan to open it once.

## 2. Look on both sides

For each row and country, open the government page of the destination and the ministry page of the passport. Write a
note from each page for each question it answers, with its address and the date it gives. A search result is not a
note (W4). If a page is not on a domain of `sources.json`, write that it is not official and do not use it as a
source.

## 3. Give each source its status

What a source says about one question, in one status:

- `in_order`: nothing is asked of this traveller for this question;
- `to_do`: something has to be done or carried (a visa to ask for, a form before arriving, a vaccine certificate, a
  passport valid for a period, an insurance), with its period and its cost if the page gives them;
- `warning`: nothing is asked, but the page warns of something the traveller should know;
- `blocks`: the page says this traveller cannot do this trip as it is (entry refused for that passport, a ministry
  that advises against all travel there).

## 4. Fill each cell

Put each cell's sources together. If they say the same status, that is the cell's status. If they do not, the cell is
`doubtful`, `sources_disagree`, with all of them. Check RP4 before writing `in_order`. A cell with nothing official
found is `doubtful`, `not_found`, with no sources or with the ones you have.

For `passport_validity`, write the rule in `valid_for` as the page gives it. For a `to_do` with a period before
arrival, write it in `before_arrival`; with a cost, in `cost`.

## 5. Self-critique

Before delivering: a cell missing or repeated; a source that is not official for its side or has no date; a cell
whose status is not what its sources say; an `in_order` with one source of the traveller's own country; a word that
says the traveller can enter; a date you worked out yourself.
