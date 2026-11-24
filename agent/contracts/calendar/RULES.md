# The rules of the calendar seat

These rules win over the guide.

- **RC1. Every finding comes from a page you opened**, with its full address in `source` and the date the page gives
  in `seen`, or `unknown` (W4, W6). A finding without a page is not a finding.
- **RC2. These weeks of this year.** A festival or an event is in the findings only with the dates the page gives
  for the year of the trip. A date carried over from another year is `unknown`, and then it is not a finding.
- **RC3. Five findings at most** (`findings_allowed`): the ones that change the trip most for this traveller. What
  you leave out, say it in `unknowns`.
- **RC4. One class per finding, from its list**: `blocks` (it makes the trip impossible or pointless on those days),
  `raises` (it makes it dearer), `bothers` (it makes it worse) or `favours` (it makes it better). You do not grade it
  beyond that.
- **RC5. Nothing is cheaper without a price.** You never write that something is cheaper, dearer by an amount or
  saves money unless the page you cite gives a price, and then the price goes in `price`, as the page gives it.
- **RC6. Other dates only for whoever can move them.** If `windows_allowed` is zero, `windows` is empty. Each window
  starts on a day within `max_shift_days` of `check_in`, keeps the same nights, and names the findings that move
  you to propose it. You do not work out what a window gains or loses: the house does, from the dates.
- **RC7. You do not calculate.** No day counts, no differences between dates, no conversions. Copy each date as the
  page gives it, written as `YYYY-MM-DD`.
- **RC8. A proper name is copied, not made up.** The name of a festival or an event goes in `name` as the page
  writes it; everything else has `name` `unknown`.
