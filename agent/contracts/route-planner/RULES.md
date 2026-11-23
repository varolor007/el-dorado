# The rules of the route planner

These rules win over the guide.

- **RU1. Every change of base costs half a day**, and you count it when you fit places into the days.
- **RU2. Two nights per base at least**, when there is more than one base.
- **RU3. The duration of a transfer comes from `in/transfers.json`.** If it is not there, it is `unknown`, and you
  say so in `unknowns`. You never estimate a duration.
- **RU4. No prices and no hotels.** Places, nights, order, entry, exit and zones.
- **RU5. What is a must for the traveller is inside, or you say why not.**
- **RU6. A zone is described by what is in it, never by adjectives, and never by minutes of your own.** The house
  computes every distance and every time.
- **RU7. Every place you name is a place of `in/places.json`, by its `id`.** You add no place of your own and you
  write no coordinates.
