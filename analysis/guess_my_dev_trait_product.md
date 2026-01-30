# Guess My Dev Trait

**Product Concept:** Daily prediction game where users guess CB development traits before the model reveals its predictions, then see the actual results.

---

## Core Loop

```
DAILY FLOW:
┌─────────────────────────────────────────────────────────────┐
│  MORNING: 35 new CB recruits released                       │
│     ↓                                                       │
│  USER PHASE: Swipe through, guess each dev trait            │
│     ↓                                                       │
│  REVEAL 1 (e.g., 6 PM): Model predictions shown             │
│     ↓                                                       │
│  REVEAL 2 (e.g., 9 PM): Actual dev traits revealed          │
│     ↓                                                       │
│  SCORING: User vs Model vs Reality                          │
└─────────────────────────────────────────────────────────────┘
```

---

## User Experience

### 1. The Daily Stack (Morning Release)

User sees a card for each CB with:
- Name
- Star rating
- Archetype (Zone, B&R, Field, Boundary)
- Gem color
- Key stats (SPD, ACC, AGI, COD, MAN, ZC)
- Abilities (if any)

**User swipes/taps to guess:**
- Star/Elite (green button)
- Normal/Impact (red button)

Optional: Confidence slider (how sure are you?)

### 2. The Waiting Period

After submitting all 35 guesses:
- Show countdown timer to Reveal 1
- Tease: "Model is thinking..."
- Optional: Show aggregate stats ("72% of players guessed Star/Elite for #12")

### 3. Reveal 1: Model Predictions (6 PM)

Dramatic reveal animation for each:
- Show model's prediction
- Show which rule triggered (if any)
- Compare to user's guess
- Running score: User vs Model agreement

### 4. Reveal 2: Actual Results (9 PM)

The truth is revealed:
- Actual dev trait shown
- User score calculated
- Model score calculated
- Head-to-head: Did you beat the model?

---

## Scoring System

### Individual Recruit Scoring
| Outcome | Points |
|---------|--------|
| Correct guess | +10 |
| Matched model (both right or both wrong) | +2 |
| Beat the model (you right, model wrong) | +25 BONUS |
| Model beat you (model right, you wrong) | -5 |

### Daily Stats
- **Your accuracy:** X/35 correct (X%)
- **Model accuracy:** Y/35 correct (Y%)
- **Beat the model:** Z times today
- **Streak:** Days in a row you beat model overall

### Leaderboard Categories
- Daily accuracy
- Weekly accuracy
- Streak (consecutive days beating model)
- "Model Slayer" (most times beating model)

---

## Gamification Elements

### Achievements
- "First Blood" - Beat the model on your first day
- "Sharp Eye" - 80%+ accuracy in a day
- "Model Slayer" - Beat model 5 days in a row
- "Perfect Game" - 35/35 correct
- "Rule Learner" - Correctly guess all TIER 1 recruits
- "Gem Whisperer" - Never miss a green gem recruit
- "Red Flag" - Correctly avoid all red gem busts

### Daily Challenges
- "Speed Round" - Guess all 35 in under 5 minutes
- "Confidence Game" - High confidence guesses worth 2x
- "Upset Special" - Bonus for correctly predicting model misses

---

## Social Features

### Share Card
After Reveal 2, generate shareable image:
```
┌─────────────────────────────┐
│  GUESS MY DEV TRAIT         │
│  Day #42                    │
│                             │
│  My Score:    28/35 (80%)   │
│  Model Score: 25/35 (71%)   │
│                             │
│  🏆 I BEAT THE MODEL! 🏆    │
│                             │
│  🟩🟩🟩🟥🟩🟩🟩🟩🟥🟩       │
│  🟩🟩🟥🟩🟩🟩🟩🟩🟩🟩       │
│  🟩🟥🟩🟩🟩🟩🟩🟥🟩🟩       │
│  🟩🟩🟩🟩🟩                 │
└─────────────────────────────┘
```

### Multiplayer Mode
- Challenge friends to same daily set
- Private leagues
- Trash talk after reveals

---

## Data Pipeline

### Daily Content Generation
```
1. Pull 35 CBs from recruitment pool
2. Run through prediction model
3. Store predictions (hidden until reveal)
4. Store actual dev traits (hidden until reveal)
5. Schedule reveals
```

### Where Do Recruits Come From?
Options:
- **A. Simulated:** Generate realistic recruits from stat distributions
- **B. Historical:** Pull from training data (408 real CBs)
- **C. Live:** Partner with community for real dynasty data
- **D. User-submitted:** Users submit their own recruits

### Preventing Cheating
- Recruits randomized/anonymized (no name lookup)
- Server-side reveal timing
- Rate limit guesses (can't change after submission)

---

## Technical Architecture

### Frontend (React Native / Expo)
```
screens/
├── DailyStackScreen.tsx      # Swipe through 35 recruits
├── WaitingRoomScreen.tsx     # Countdown to reveals
├── Reveal1Screen.tsx         # Model predictions
├── Reveal2Screen.tsx         # Actual results + scoring
├── LeaderboardScreen.tsx     # Rankings
└── ProfileScreen.tsx         # Stats, achievements
```

### Backend Requirements
- Daily content scheduling
- User guess storage
- Reveal timing enforcement
- Leaderboard calculations
- Push notifications for reveals

### Database Schema
```
daily_challenges:
  - id
  - date
  - recruits[] (35 recruits with stats)
  - model_predictions[] (hidden until reveal 1)
  - actual_results[] (hidden until reveal 2)
  - reveal_1_time
  - reveal_2_time

user_guesses:
  - user_id
  - challenge_id
  - guesses[] (35 guesses)
  - submitted_at
  - score (calculated after reveal 2)

user_stats:
  - user_id
  - total_correct
  - total_guesses
  - model_beats
  - current_streak
  - achievements[]
```

---

## MVP Features (v1.0)

Priority 1 (Launch):
- [ ] Daily stack of 35 CBs
- [ ] Swipe to guess interface
- [ ] Model prediction reveal
- [ ] Actual result reveal
- [ ] Basic scoring (accuracy %)
- [ ] Share card generation

Priority 2 (Week 2):
- [ ] Leaderboard
- [ ] User accounts
- [ ] Streak tracking
- [ ] Push notifications

Priority 3 (Month 2):
- [ ] Achievements
- [ ] Friend challenges
- [ ] Historical stats
- [ ] Multiple positions (QB, WR, etc.)

---

## Monetization Ideas

### Free Tier
- Play daily challenge
- Basic stats
- Share cards

### Premium Tier ($2.99/month)
- See model's rule explanations
- Advanced personal analytics
- Ad-free experience
- Historical challenge archive
- Custom leagues

### One-time Purchases
- Cosmetic share card themes
- Profile badges

---

## Success Metrics

| Metric | Target |
|--------|--------|
| DAU | 1,000+ |
| Day 1 → Day 7 retention | 40%+ |
| Daily completion rate | 60%+ |
| Share rate | 20%+ |
| Average session time | 5-10 min |

---

## Name Alternatives

- Guess My Dev Trait (current)
- Dev Trait Daily
- Scout's Challenge
- Recruit Roulette
- The Scouting Report
- Star or Bust
- Dev Trait Duel

---

## Next Steps

1. Design swipe card UI mockup
2. Build recruit card component
3. Create daily content pipeline
4. Implement reveal timing system
5. Build scoring logic
6. Design share card template
7. Beta test with small group
