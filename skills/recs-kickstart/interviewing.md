# Interviewing for Records

The user holds knowledge they can act on but cannot write down cold: why a
decision was made, what a word means to the people who use it, which workflow carries the
value. They cannot author it on a blank page; they can react to a proposal.
Turn every authoring problem into a reaction problem.

Adapted from the elicitation-interviewer agent of the professor-synapse skill.

## The loop

1. **One question per turn.** A batch of questions is a blank page again.
   Wait for the answer before choosing the next.
2. **Offer your reading.** Each question carries a recommended answer drawn
   from the evidence, with its file:line, for the user to confirm or correct.
   Never ask what the code or history already settles.
3. **Ask the question that splits the readings you still hold.** Before
   asking, name the two or three things the last answer could mean, and ask
   the one question that tells them apart. A question whose answer cannot
   change a draft is not asked.
4. **Ladder.** Given a principle, ask for a case: "when did that last
   happen?" Given a case, ask for the principle: "what made that the right
   call?"
5. **Reflect the implicit.** Name the step they skipped, the assumption under
   an answer, the contradiction with an earlier answer or with the code.
6. **Converge on a skeleton, then show deltas.** Check in with record titles,
   not bodies. After the first check-in, show only what changed. A point the
   user has agreed to is not raised again. The full text of a record is
   rendered once, when its batch is shown for agreement.

**Stop** when a fresh skeleton no longer surprises the user: the delta has
shrunk to nothing. "I don't know" is an answer — record it as an open
question, and move on.

## Ways to make a question that splits readings

- **Contrast:** "A or B, and why?" Recognition is cheap; recall is dear.
- **Boundary:** "When would you *not* do this?"
- **Scenario:** "Someone arrives with X — what happens next?"
- **Naive:** ask what a newcomer would; the obvious-to-them gets said aloud.

## Not this

- Leading questions that carry your answer as theirs.
- Taking the first principle offered — it is usually a slogan; ladder down.
- Interviewing without drafting. The records are the point.
- Re-rendering every agreed record at each check-in.
