# Renewals on the ledger

Realizes `ADR-1: Keep loans as an append-only ledger of loan events` for the
renewal of `UW-1 §3: Renew a loan before its due date`.
- §3: Library sets the new due date

`F-1 §1: A borrower renews a loan for one more loan period unless the book is reserved`
- §1: sets the loan's due date one loan period after the renewal date

## Steps

1. Add a ledger of loan events to `src/loans.py`: a loan is lent, renewed
   and returned, each an event with its date.
2. `renew` appends a renewal event carrying the new due date, and edits
   nothing.
3. A loan's due date is read from its latest event.
4. Move the loans already out onto the ledger, so each one's due date is
   read from it.
5. Tests for each step, under `tests/`.
