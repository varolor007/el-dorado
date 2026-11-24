# The guide of the conductor

1. **Read the stop.** In `in/stop.json`, the step, the seat and the kind of stop the house sees. In
   `in/record.json`, how the run got there: how many passes that seat had and what they cost.
2. **Read every pass.** In `in/rounds.json`, the reds of each pass with their lines. Note what each red says, and
   whether the same red comes back from pass to pass or a fix of one red brought another.
3. **Read the contract of that seat.** In `in/seat-contract/`, find the rule or the field each red is about. Note
   whether the seat could have known, from its contract, how to do it right.
4. **Decide what kind of red it is.**
   - **Form**: the work was there, but written the wrong way (a missing extension in a source, a field outside its
     list, a note split in a way the house cannot read, a delivery that was not handed in). It has a clear fix that
     you can say in one or two sentences.
   - **Substance**: what the seat was asked cannot be done with its material, or the reds say the request itself
     does not fit (nothing to choose from, a kind of trip the house does not plan yet).
   - **Unclear**: you cannot tell from what you see.
5. **Choose the way out.**
   - `retry_with_hint` only if the red is of form, the fix is clear and `can_retry` is `true`. Write the hint for
     the seat, not for the traveller: what to do differently, pointing to the rule or the field of its contract.
   - `stop_and_tell` in every other case. Choose the `kind` that says what happened, and the `options` the
     traveller has, from `allowed_options` only.
6. **Write the message, if it helps.** One or two plain sentences for the traveller, in their `language`, saying
   what happened and what they can do. No numbers, no names of steps or seats, no promises. If you are not sure,
   leave it empty: the website says it with its own words.
