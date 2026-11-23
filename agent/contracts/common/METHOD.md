# The method of every seat

Six steps, in this order. Each step leaves its file in `out/`, and no step starts before the previous one has left its
file. Each file is written once: what a later step changes is written in that later step, never by going back. The
house checks from outside that the files exist and were written in this order.

1. **Acknowledgement** (`out/1-acknowledgement.md`). List what you received: name every file and folder at the top of
   `in/`, say what each one holds, and say what is missing. If something is missing without which you cannot work, say
   so here, and still hand in a delivery that says what you could not do.
2. **Plan** (`out/2-plan.md`). Before looking closely, write what you are going to look at, what you expect to find
   and what would change your mind. This keeps you from stopping at the first thing you see.
3. **Notes** (`out/3-notes.md`). Work through the material and write down what you find, as you find it. Every note
   is one line that starts with `- ` and ends with its source and its label, each in square brackets:
   `- Two single beds and a desk by the window. [in/photos/room-01.jpg] [seen]`. The label is `seen` (you read or saw
   it in the source), `deduced` (it follows from other notes) or `assumed` (you could not check it). A `seen` note
   names the file of `in/` it comes from, with its path; several files go in the same brackets, separated by commas,
   and a part of a file after `#`, as in `[in/reviews.json#r12]`. Notes describe; they do not judge yet.
4. **Computations** (`out/4-computations.md`). You do not calculate: no sums, no date arithmetic, no currency
   conversion, no averages. If you need a number that is not in `in/`, write here exactly what the house should
   compute, and go on without it. If you need none, write `None needed.`
5. **Self-critique** (`out/5-self-critique.md`). Read your notes against your plan. What is missing, what contradicts
   what, what could be wrong, and what you could not see. Two passes at most. If a pass corrects a note, write the
   correction here, under `Corrections`. What stays unknown stays unknown.
6. **Delivery** (`out/delivery.json`). Only now, and only from your notes and their corrections. The fields are fixed
   by your seat's `DELIVERY.md`.
