"""Regenerate data/messages.json from fortunes.txt-style list below.
Keys are random and permanent: once a fortune is published, never change its key
(shared links point at it). To add fortunes, append to data/messages.json by hand
with a new random key (run `python3 scripts/new-key.py`)."""
import json, os, secrets, sys

if os.path.exists("data/messages.json"):
    sys.exit("data/messages.json already exists; regenerating would change every share link. Edit it by hand instead.")

ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"  # no 0/o/1/l/i lookalikes
def key(n=6): return "".join(secrets.choice(ALPHABET) for _ in range(n))

FORTUNES = [
 "You will soon find something you thought you had lost.",
 "A small kindness today becomes a large one tomorrow.",
 "The best time to start was yesterday. The second best is now.",
 "Someone is quietly rooting for you.",
 "Your next good idea will arrive while you are doing the dishes.",
 "Patience is bitter, but its fruit is sweet.",
 "Say yes to the invitation you were about to decline.",
 "A detour will lead you somewhere better than the plan.",
 "You are closer than you think.",
 "Good news travels slowly, but it is on its way.",
 "Take the long way home today.",
 "What you water will grow.",
 "A conversation this week will change how you see something.",
 "Trust the version of you that started this.",
 "Rest is part of the work.",
 "The answer you seek is simpler than the question.",
 "You will laugh about this by next month.",
 "An old friend will surprise you with a message.",
 "Begin before you feel ready.",
 "Your curiosity will open a door that talent could not.",
 "Something small you finish today will matter more than you expect.",
 "Be the reason someone's day is easier.",
 "A quiet morning is coming. Enjoy it without hurry.",
 "Not every storm has come to disrupt your life; some clear your path.",
 "You already have what you need for the next step.",
 "Today's mistake is tomorrow's good story.",
 "Listen twice as much as you speak and you will be rarely wrong.",
 "The thing you are avoiding is smaller than the worry about it.",
 "Luck favors those who leave the house.",
 "A warm meal shared will outshine any grand plan.",
 "Change the question and the answer will change with it.",
 "Your kindness is noticed more than you know.",
 "Finish the page, then go outside.",
 "Soon you will make a decision you will be proud of.",
 "The road is long, but the company will be good.",
 "Do one brave thing before lunch.",
 "Something ordinary is about to become your favorite.",
 "Your effort is planting seeds you have not yet seen.",
 "A little courage today saves a lot of regret later.",
 "The next page of your story is better than the last.",
]
assert len(set(FORTUNES)) == len(FORTUNES)
too_long = [f for f in FORTUNES if len(f) > 80]
assert not too_long, too_long
keys = set(); out = []
for t in FORTUNES:
    k = key()
    while k in keys: k = key()
    keys.add(k); out.append({"id": k, "text": t})
json.dump(out, open("data/messages.json", "w"), indent=2, ensure_ascii=False)
print(len(out), "fortunes written; longest:", max(len(f) for f in FORTUNES), "chars")
