# NCAA Recruiting Dev Trait Predictor

Predicts the hidden "dev trait" (Normal, Impact, Star, Elite) of recruits in NCAA College Football 25/26 based on visible scouting data.

## Project Structure

```
NCAA_Recruiting/
├── app/                    # React Native Expo mobile app
├── api/                    # FastAPI prediction service (deploy to Fly.io)
├── analysis/               # Python ML analysis scripts
├── supabase/               # Database migrations
└── notes/                  # Documentation
```

## Models

| Model | Archetype | CV AUC |
|-------|-----------|--------|
| Dual Threat | Dual Threat QB/ATH | 0.808 |
| Binary | Pocket Passer, Backfield Creator | 0.687 |

### Key Rules (Dual Threat)

- **TP >= 95**: 91% Star/Elite
- **TP >= 95 + Green Gem**: 95% floor
- **Green Gem**: 78% Star/Elite
- **Red Gem**: 35% ceiling

## Quick Start

### API (local)

```bash
cd api
pip install -r requirements.txt
python train_and_save_model.py
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API (deploy to Fly.io)

```bash
cd api
fly launch
fly deploy
```

### Mobile App

```bash
cd app
npm install
npx expo start
```

Create `app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_PREDICTION_API_URL=http://YOUR_IP:8000
```

## Tech Stack

- **App**: React Native / Expo
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **ML API**: FastAPI + scikit-learn
- **OCR**: Claude Vision API
- **Hosting**: Fly.io (API)
