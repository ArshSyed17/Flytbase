# Account Quest — 3-Minute Walkthrough Script

Target ≈ 450 spoken words. Timings are guides. Before recording: make sure the cache is synced and that one new signal will arrive during the demo (refresh events 60 s before the take, or press Refresh events at 1:50 and cut to the result).

## 0:00–0:20 — Introduction
*(Screen: Overview page)*
"I'm [name], and this is Account Quest, a Customer Success CRM for the Questathon. It reads live account data from the Questathon MCP server and tells a customer success manager what the book is worth, who holds the power, what to do first, what is about to go wrong, and what we still don't know. It's hosted publicly, so you can open it without my laptop."

## 0:20–0:45 — Overview
*(Point at the judging-criteria strip, stats, charts)*
"Every number here is calculated from the cached MCP responses. The top strip shows the five judging criteria live: five questions answered, how many deal values are backed by a document, three owned and dated moves per account, documented unknowns, and live updates with notes written back. In the header you can see the last sync time and the cooldown: MCP allows one call per minute, so everything goes through a queue, and browsing never spends a call."

## 0:45–2:00 — Five questions for one account
*(Open Five Questions → pick account [Account Name])*
"**Q1, what is the book worth:** [total] across [N] deals. [X] is verified by documents; [Y] is only on the account sheet, so it's shown separately, not as fact.
**Q2, who holds the power:** [Decision maker] decides, [Budget owner] pays, [Champion] is our champion. The map shows where each person stands with us, and [Name] has not been met yet.
**Q3, what to do first:** three moves, each with an owner, a due date, the deal, evidence IDs, the expected outcome, and the scoring reason. Any date we chose ourselves is labelled an internal target.
**Q4, what's about to go wrong:** red, amber and green, and each risk prints the evidence behind it, for example [deadline in N days with an open blocker].
**Q5, what we don't know:** each unknown says why it matters, who can tell us, and the exact next question."

## 2:00–2:25 — Tracing one number
*(Click the evidence chip on a deal value in Q1)*
"Here's the [$ amount] for [deal]. Clicking its evidence ID opens the source: the paperwork record [DOC:id] where the same amount appears, with the snippet and the raw MCP record as stored. If a number had no source, it would be marked unverified."

## 2:25–2:45 — Receiving something new
*(Live Events → Refresh events; wait for it)*
"Now I refresh live events. A new signal arrives, it's flagged NEW, and the account's insights are marked for review. I can refresh the account sheet when the cooldown allows. Then I'll write a note back: [type a risk note]. It shows as saved only after the MCP server confirms it, and here's the response."

## 2:45–3:00 — Code and architecture
*(Show repo tree or README diagram)*
"React and Tailwind on the front; an Express API holds the MCP token as a server-side environment variable. One serialized queue enforces the 60-second limit and survives restarts. Responses are stored raw in SQLite, normalized without inventing anything, and a rules engine produces the five answers with evidence IDs. Code and README are on GitHub. Thanks for watching."
