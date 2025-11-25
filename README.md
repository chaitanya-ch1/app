# Pharma Insights

A pharmacy sales analytics and forecasting dashboard built with FastAPI, React, and MongoDB.

## Features

- **Dashboard**: View key metrics including total sales, average demand, and top 5 drugs
- **Forecast**: Interactive line charts comparing actual vs predicted demand using SARIMA-style forecasting
- **Insights**: AI-powered recommendations for inventory, pricing, and operations
- **Authentication**: JWT-based email/password authentication
- **ML API Integration**: Ready to connect with external Flask ML microservice

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Plotly.js, Shadcn UI
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Authentication**: JWT with bcrypt password hashing

## Project Structure

```
/app
├── backend/
│   ├── server.py        # FastAPI application with all routes
│   ├── .env             # Environment variables
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js       # Main React application
│   │   ├── App.css      # Custom styles
│   │   └── components/  # UI components
│   ├── .env             # Frontend environment variables
│   └── package.json     # Node dependencies
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Sales Data
- `GET /api/sales` - Fetch pharmacy sales data (supports `days` and `drug` query params)
- `GET /api/sales/metrics` - Get aggregated sales metrics
- `GET /api/sales/trends` - Get daily sales trends for charts

### Forecasting
- `GET /api/predict` - Get demand forecast (mock SARIMA or external ML API)

### Insights
- `GET /api/insights` - Get AI recommendations (supports `category` and `priority` filters)
- `GET /api/drugs` - Get list of all drugs

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=pharma_insights
JWT_SECRET_KEY=your-secret-key
ML_API_URL=               # Optional: URL to external ML microservice
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## ML API Integration

To connect an external ML microservice, set the `ML_API_URL` environment variable:

```bash
ML_API_URL=http://ml-service:5000
```

The backend will call `{ML_API_URL}/predict` with query parameters. If not configured, mock SARIMA predictions are used.

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

## Deployment

### Vercel (Frontend)
1. Connect your GitHub repository
2. Set `REACT_APP_BACKEND_URL` environment variable
3. Deploy

### Render (Backend)
1. Create a new Web Service
2. Set environment variables
3. Use `uvicorn server:app --host 0.0.0.0 --port $PORT` as start command

## License

MIT
