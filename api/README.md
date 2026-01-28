# NCAA Recruiting Prediction API

FastAPI service that runs trained ML models to predict Star/Elite probability for QB/ATH recruits.

## Models

- **Dual Threat Model** (CV AUC: 0.808) - Used for Dual Threat archetype
- **Binary Model** (CV AUC: 0.687) - Used for Pocket Passer and Backfield Creator

## Local Development

### 1. Install dependencies

```bash
cd api
pip install -r requirements.txt
```

### 2. Train and save models

```bash
python train_and_save_model.py
```

### 3. Run the API

```bash
uvicorn main:app --reload
```
python3 -m uvicorn main:app --reload --port 8000

API will be available at http://localhost:8000

### 4. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Single prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recruit",
    "position": "QB",
    "archetype": "Dual Threat",
    "star_rating": 4,
    "gem_color": "green",
    "stats": {
      "throw_power": 92,
      "speed": 85,
      "short_accuracy": 80,
      "awareness": 70
    }
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/predict` | POST | Predict single recruit |
| `/predict/batch` | POST | Predict multiple recruits (ranked) |

## Deployment Options

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Connect Railway to your repo
3. Railway auto-detects Dockerfile
4. Set environment variables if needed
5. Deploy

### Option 2: Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect to your repo
4. Set:
   - Build Command: `pip install -r requirements.txt && python train_and_save_model.py`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option 3: Docker (Any Host)

```bash
# Build
docker build -t ncaa-prediction-api .

# Run
docker run -p 8000:8000 ncaa-prediction-api
```

### Option 4: Fly.io

```bash
# Install flyctl
brew install flyctl

# Login
fly auth login

# Launch (from api directory)
fly launch

# Deploy
fly deploy
```

## Environment Variables (App)

After deploying, update your React Native app's `.env`:

```
EXPO_PUBLIC_PREDICTION_API_URL=https://your-deployed-api-url.com
```

## Response Format

```json
{
  "name": "Test Recruit",
  "position": "QB",
  "archetype": "Dual Threat",
  "star_elite_probability": 0.823,
  "star_elite_percentage": 82,
  "recommendation": "MUST RECRUIT: Very high Star/Elite probability",
  "confidence": "High",
  "model_used": "Dual Threat Model (CV AUC: 0.808)"
}
```
