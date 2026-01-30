# CB Scout Web App - Planning Document

**Purpose:** Public-facing web tool for users to get CB recruit predictions without revealing proprietary model details.

---

## Core Requirements

### Must Have
- [ ] Manual stat entry form (no screenshot upload)
- [ ] Position dropdown (CB only for now, expandable later)
- [ ] Clean, minimal UI with clear recommendations
- [ ] Save recruits to database with `user_submitted` flag
- [ ] **HIDE all rule/model details from users**
- [ ] Mobile-responsive design

### Must NOT Have
- [ ] No rule names shown ("CB Athletic Sum ≥372" etc.)
- [ ] No model type shown ("Rule:" vs "RF")
- [ ] No RF score comparison
- [ ] No tier labels (T1, T2, etc.) - internal use only
- [ ] No feature importance or debug info

---

## User Experience

### Input Form

```
┌─────────────────────────────────────────────────────────┐
│                    CB SCOUT                             │
│            Know Before You Recruit                      │
│                                                         │
│  Position    [ Cornerback ▼ ]                          │
│  Archetype   [ Zone ▼ ]                                │
│  Star Rating [ ★★★★☆ ]                                 │
│  Gem         [ Green ▼ ]  (or None)                    │
│                                                         │
│  ─────────── Athletic Stats ───────────                │
│  Speed [__]  Acceleration [__]  Agility [__]           │
│  Change of Direction [__]                               │
│                                                         │
│  ─────────── Coverage Stats ───────────                │
│  Man Coverage [__]  Zone Coverage [__]  Press [__]     │
│                                                         │
│  ─────────── Other Stats ──────────────                │
│  Awareness [__]  Tackle [__]  Catching [__]            │
│                                                         │
│  ─────────── Abilities (Optional) ─────                │
│  [ ] Jammer   [ ] Robber   [ ] Other: [________]       │
│                                                         │
│              [  GET PREDICTION  ]                       │
└─────────────────────────────────────────────────────────┘
```

### Output Display (With Tiers)

**TIER 1 Result:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     🥇  TIER 1 - ELITE PROSPECT                        │
│                                                         │
│              95% Star/Elite                             │
│                                                         │
│     93% of recruits with this profile become           │
│     Star or Elite. This is a must-recruit CB.          │
│                                                         │
│              [ SCOUT ANOTHER ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**TIER 2 Result:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     🥈  TIER 2 - STRONG PROSPECT                       │
│                                                         │
│              70% Star/Elite                             │
│                                                         │
│     79% of recruits like this develop well.            │
│     High priority target.                              │
│                                                         │
│              [ SCOUT ANOTHER ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**AVOID Result:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     🔴  AVOID - HIGH RISK                              │
│                                                         │
│              20% Star/Elite                             │
│                                                         │
│     Only 17% of recruits with this profile             │
│     become Star/Elite. Look elsewhere.                 │
│                                                         │
│              [ SCOUT ANOTHER ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**No Tier (RF Fallback):**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ⚪  UNCERTAIN                                       │
│                                                         │
│              42% Star/Elite                             │
│                                                         │
│     No strong indicators either way.                   │
│     Consider team needs and other factors.             │
│                                                         │
│              [ SCOUT ANOTHER ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tier System (User-Facing)

Show tiers WITH confidence explanations - this is a selling point!

| Tier | Label | Hit Rate | What We Tell Users |
|------|-------|----------|-------------------|
| **T1** | ELITE PROSPECT | 93% | "93% of recruits like this become Star/Elite" |
| **T2** | STRONG PROSPECT | 79% | "79% hit rate - very good odds" |
| **T3** | SOLID PROSPECT | 68% | "68% hit rate - better than average" |
| **T4** | AVERAGE PROSPECT | 61% | "61% hit rate - slightly above baseline" |
| **AVOID** | HIGH RISK | 17% | "Only 17% become Star/Elite - proceed with caution" |
| **--** | UNCERTAIN | varies | "No strong signals - use other factors" (RF fallback) |

### Tier Explainer Section (On Page)

```
┌─────────────────────────────────────────────────────────┐
│  HOW OUR TIERS WORK                                     │
│                                                         │
│  Our model analyzes thousands of CB recruits to         │
│  identify patterns that predict Star/Elite development. │
│                                                         │
│  🥇 TIER 1 - Elite Prospect (93% hit rate)             │
│     Nearly guaranteed Star/Elite development            │
│                                                         │
│  🥈 TIER 2 - Strong Prospect (79% hit rate)            │
│     Very high confidence, prioritize these              │
│                                                         │
│  🥉 TIER 3 - Solid Prospect (68% hit rate)             │
│     Good odds, worth recruiting                         │
│                                                         │
│  ⚪ TIER 4 - Average Prospect (61% hit rate)           │
│     Above baseline, consider other factors              │
│                                                         │
│  🔴 AVOID - High Risk (17% hit rate)                   │
│     Below average potential, look elsewhere             │
│                                                         │
│  Baseline: Random CB has ~32% chance of Star/Elite     │
└─────────────────────────────────────────────────────────┘
```

**What we SHOW:** Tier label, hit rate, confidence level
**What we HIDE:** The specific rules/stats that determine each tier

---

## Security: Hiding Model Details

### What to Show vs Hide

| Data | Mobile App | Web App | Why |
|------|------------|---------|-----|
| Tier label (T1-T4) | ✓ Shown | ✓ Shown | Selling point! |
| Tier hit rates | ✓ Shown | ✓ Shown | Builds trust |
| Probability % | ✓ Shown | ✓ Shown | Core value |
| Rule name | ✓ Shown | ✗ **Hidden** | Proprietary |
| Rule thresholds | ✓ Shown | ✗ **Hidden** | Proprietary |
| Model type (Rule/RF) | ✓ Shown | ✗ **Hidden** | Proprietary |
| RF raw score | ✓ Shown | ✗ **Hidden** | Confusing + proprietary |
| Feature importance | ✗ Hidden | ✗ **Hidden** | Proprietary |

**The secret sauce:** Users see THAT a recruit is Tier 1, but not WHY (the specific stat thresholds).

### Implementation

```typescript
// PUBLIC prediction result (web app)
interface PublicPredictionResult {
  probability: number;           // 0-100
  tier: string | null;           // "T1", "T2", "T3", "T4", "AVOID", or null
  tierLabel: string;             // "ELITE PROSPECT", "STRONG PROSPECT", etc.
  tierHitRate: string;           // "93%", "79%", etc.
  description: string;           // User-friendly explanation
}

// INTERNAL prediction result (kept server-side, NEVER sent to client)
interface InternalPredictionResult {
  probability: number;
  rule_applied: string;          // NEVER expose - e.g., "CB Athletic Sum ≥372"
  rule_thresholds: object;       // NEVER expose - the actual stat cutoffs
  rf_score: number;              // NEVER expose
  model_type: string;            // NEVER expose - "Rule" vs "RF"
}
```

### Code Obfuscation

1. **Bundle the prediction code minified/uglified**
2. **Don't include rule names as strings** - use hashes or numbers internally
3. **Consider moving prediction to serverless function** if paranoid
   - Vercel/Netlify Edge Function
   - User sends stats → Server returns only probability + recommendation

### Recommended Architecture for Security

```
OPTION A: Client-side (faster, less secure)
┌─────────┐     ┌─────────────────┐     ┌──────────┐
│ Browser │ ──► │ Minified JS     │ ──► │ Result   │
│  Form   │     │ (rules hidden)  │     │ (clean)  │
└─────────┘     └─────────────────┘     └──────────┘

OPTION B: Server-side (slower, more secure) ★ RECOMMENDED
┌─────────┐     ┌─────────────────┐     ┌──────────┐
│ Browser │ ──► │ Edge Function   │ ──► │ Result   │
│  Form   │     │ (rules on server)│    │ (clean)  │
└─────────┘     └─────────────────┘     └──────────┘
```

**Recommendation:** Use Option B (Edge Function) to keep rules completely server-side.

---

## Database Schema

### New Table: `web_submissions`

```sql
CREATE TABLE web_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source tracking
  source VARCHAR(20) DEFAULT 'web',        -- 'web', 'mobile', 'api'
  user_submitted BOOLEAN DEFAULT TRUE,      -- FALSE = verified/admin added
  ip_hash VARCHAR(64),                      -- Hashed IP for rate limiting

  -- Recruit data
  position VARCHAR(10) NOT NULL,
  archetype VARCHAR(30) NOT NULL,
  star_rating INTEGER,
  gem_color VARCHAR(10),

  -- Stats (JSONB for flexibility)
  stats JSONB NOT NULL,
  abilities TEXT[],

  -- Prediction results (internal - don't expose in API)
  prediction_probability DECIMAL(5,4),
  prediction_rule VARCHAR(100),             -- Internal use only
  prediction_tier VARCHAR(10),              -- Internal use only

  -- Optional: user feedback
  actual_dev_trait VARCHAR(20),             -- If user reports back
  feedback_date TIMESTAMPTZ
);

-- Index for analytics
CREATE INDEX idx_web_submissions_source ON web_submissions(source, user_submitted);
CREATE INDEX idx_web_submissions_position ON web_submissions(position);
```

### Data Quality Flags

```sql
-- Add to existing recruits table or create view
ALTER TABLE recruits ADD COLUMN IF NOT EXISTS
  data_source VARCHAR(20) DEFAULT 'verified';

-- Values:
-- 'verified'     = Admin/owner added, trusted
-- 'web_user'     = Random web user, may have errors
-- 'web_validated'= Web user + confirmed dev trait matches
```

### Query for Training (Exclude Untrusted)

```sql
-- Only use verified data for training
SELECT * FROM recruits
WHERE data_source = 'verified'
   OR data_source = 'web_validated';
```

---

## Tech Stack

### Recommended: Next.js + Vercel

```
webapp/
├── app/
│   ├── page.tsx              # Main form
│   ├── layout.tsx            # Layout + meta
│   └── api/
│       └── predict/
│           └── route.ts      # Edge function (keeps rules hidden)
├── components/
│   ├── StatInput.tsx         # Reusable stat input
│   ├── PredictionResult.tsx  # Clean result display
│   └── ArchetypeSelect.tsx   # Dropdown
├── lib/
│   ├── predict.ts            # Prediction logic (SERVER ONLY)
│   ├── features.ts           # Feature engineering (SERVER ONLY)
│   └── validation.ts         # Input validation
├── public/
│   └── models/
│       └── cb_rf_trees.json  # RF model (if client-side)
└── styles/
    └── globals.css
```

### API Route (Keeps Rules Secret)

```typescript
// app/api/predict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { predictCB } from '@/lib/predict';  // Server-only

// Tier info - public-safe (no rule details)
const TIER_INFO = {
  T1: { label: 'ELITE PROSPECT', hitRate: '93%', emoji: '🥇' },
  T2: { label: 'STRONG PROSPECT', hitRate: '79%', emoji: '🥈' },
  T3: { label: 'SOLID PROSPECT', hitRate: '68%', emoji: '🥉' },
  T4: { label: 'AVERAGE PROSPECT', hitRate: '61%', emoji: '⚪' },
  AVOID: { label: 'HIGH RISK', hitRate: '17%', emoji: '🔴' },
};

export async function POST(request: NextRequest) {
  const data = await request.json();

  // Validate input
  if (!isValidCBInput(data)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Get prediction (rules run on server - internal.rule_applied stays here!)
  const internal = await predictCB(data);

  // Map internal tier to public tier (hide rule details)
  const tier = internal.tier; // "T1", "T2", etc. or null
  const tierInfo = tier ? TIER_INFO[tier] : null;

  // Return ONLY public fields - rule_applied NEVER leaves server
  return NextResponse.json({
    probability: Math.round(internal.probability * 100),
    tier: tier,
    tierLabel: tierInfo?.label || 'UNCERTAIN',
    tierHitRate: tierInfo?.hitRate || null,
    tierEmoji: tierInfo?.emoji || '⚪',
    description: getTierDescription(tier, internal.probability),
  });
}

function getTierDescription(tier: string | null, prob: number): string {
  if (tier === 'T1') return '93% of recruits with this profile become Star/Elite. Must recruit!';
  if (tier === 'T2') return '79% hit rate. High priority target.';
  if (tier === 'T3') return '68% hit rate. Worth recruiting.';
  if (tier === 'T4') return '61% hit rate. Above average, consider other factors.';
  if (tier === 'AVOID') return 'Only 17% become Star/Elite. Look elsewhere.';
  return 'No strong indicators. Consider team needs and other factors.';
}
```

---

## Rate Limiting & Abuse Prevention

```typescript
// Prevent spam/scraping
const rateLimiter = {
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 predictions per minute per IP
};

// Suspicious pattern detection
function isSuspicious(requests: Request[]): boolean {
  // Systematic stat variations (trying to reverse-engineer rules)
  // Same stats with only 1 value changed repeatedly
  // etc.
}
```

---

## File Structure (Full)

```
NCAA_Recruiting/
├── app/                      # Existing mobile app
├── webapp/                   # NEW: Web app
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       └── predict/
│   │           └── route.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CBForm.tsx
│   │   ├── StatInput.tsx
│   │   ├── PredictionResult.tsx
│   │   └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── predict.ts        # PRIVATE - server only
│   │   ├── features.ts       # PRIVATE - server only
│   │   ├── rules.ts          # PRIVATE - server only
│   │   ├── rfModel.ts        # PRIVATE - server only
│   │   ├── validation.ts
│   │   └── supabase.ts
│   ├── models/
│   │   └── cb_rf_trees.json  # Keep in /lib if server-only
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
└── analysis/                 # Planning docs
```

---

## MVP Features (v1.0)

### Phase 1: Core (Week 1)
- [ ] Next.js project setup
- [ ] CB stat input form
- [ ] Server-side prediction API
- [ ] Clean result display
- [ ] Mobile responsive

### Phase 2: Database (Week 1-2)
- [ ] Supabase integration
- [ ] Save submissions with `user_submitted` flag
- [ ] Rate limiting

### Phase 3: Polish (Week 2)
- [ ] Loading states
- [ ] Error handling
- [ ] Input validation (stat ranges 0-99)
- [ ] SEO meta tags
- [ ] Analytics (privacy-respecting)

### Phase 4: Future
- [ ] User accounts (optional)
- [ ] History of predictions
- [ ] "Report actual dev trait" feedback
- [ ] Additional positions (QB, WR, etc.)

---

## Deployment

### Vercel (Recommended)
```bash
cd webapp
npx vercel
```

- Auto HTTPS
- Edge functions for API
- Preview deployments
- Free tier sufficient

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx        # Server-side only
```

---

## Domain Ideas

- cbscout.gg
- scoutmycb.com
- recruitscout.app
- cbpredictor.com
- devtraitscout.com

---

## Summary

| Aspect | Decision |
|--------|----------|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Database | Supabase |
| Prediction | Server-side API route |
| Styling | Tailwind CSS |
| Model security | Edge function, minified, no rule names |
| MVP timeline | 1-2 weeks |
