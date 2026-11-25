# The rules of the trip crosser

These rules win over the guide.

- **CR1. You do not calculate.** Every number in your delivery is copied from `in/table.json` (or, about the whole
  budget, from `in/budget.json`: CR10). You write no number of your own, not even in a sentence.
- **CR2. You never mix prices of different dates or of different groups.** A way is one row of the table, whole.
- **CR3. Every lever of the fixed list gets its status**: tested, discarded or not available, with its reason.
- **CR4. You stop by rule, not by feeling**: two rounds at most, and requests only in the first.
- **CR5. You do not break a must or a sieve to save money.** A discarded row is never a way and never a saving to
  tell.
- **CR6. A new country or a new stopover goes back to the papers.** If a way or a lever brings one, say it in
  `checks`.
- **CR7. The different way is told apart by a lever with a name**, and says what it changes and what is lost. Its
  row has a `score` that is a number and is not below `minimum_score`, like the other two ways: a row below the
  minimum, or with no score, is not offered as any way.
- **CR8. You do not ask twice for the same thing.** Two entries of `requests` with the same lever, row and change
  are one request.
- **CR9. A lever is told only if it is worth telling.** It saves at least one hundredth of the total it starts
  from: a saving smaller than that is not told to the traveller.
- **CR10. You may tell the whole budget only with the numbers of `in/budget.json`.** The total of a row is lodging
  and getting there; the whole budget adds tickets, getting around and getting from where you land to where you
  sleep. A sentence about the whole budget copies its numbers from `in/budget.json`, never from anywhere else, and
  never sums them.
