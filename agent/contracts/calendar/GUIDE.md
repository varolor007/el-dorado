# The calendar seat: step by step

The steps below are your steps 3 to 5 of the common method.

## 1. Read the trip

Read `in/trip.json` and `in/limits.json`. Write in your plan what you will look for, in this order: the weather of
those weeks, the season, the festivals and events, the public holidays there and at home, what closes and what
sells out. Write what you expect, and what would change your mind.

## 2. Look, one thing at a time

Search for each thing, open the page that decides it and write a note from that page, with its address and its
date. A search result alone is not a note (W4). When two pages give different dates for the same thing, write both
and keep the one of whoever decides (W5).

## 3. Weigh each finding for this traveller

Read each finding against `looking_for` and the dates:

- `blocks`: the trip cannot be done, or not what they are looking for: the site they come for is shut on all their
  days, the place is cut off.
- `raises`: it makes sleeping or getting there dearer: a big fair, a holiday that fills the hotels.
- `bothers`: it makes the trip worse without stopping it: heavy rain most days, a crowd, a closure of something
  that is not the reason for the trip.
- `favours`: it makes it better: a festival they would enjoy, the best weather of the year.

A finding that changes nothing for this traveller is not a finding. Keep the five that matter most.

## 4. Days the destination asks for

If an official tourism page says how many days the destination asks for, that is a finding with `topic`
`days_needed`, with the number in `days` and `from` and `to` `unknown`. You do not compare it with the trip: the
house does.

## 5. Other dates, only if they can move

If `windows_allowed` is more than zero and a finding that blocks, raises or bothers could be avoided, or one that
favours could be reached, by moving the dates, propose a window: the day it would start, within `max_shift_days`
of `check_in`, and the findings that move you to propose it. The finding that a window reaches or avoids has to be
in `findings`, with its dates, so that the house can see it. If nothing is better, propose nothing.

## 6. Self-critique

Before delivering: a finding without a page opened; a date from another year; a finding that changes nothing for
this traveller; a word about saving money without a price; a window when the dates cannot move; a window that
avoids nothing and reaches nothing.
