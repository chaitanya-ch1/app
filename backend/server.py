from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import requests
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'pharma-insights-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# ML API URL
ML_API_URL = os.getenv("ML_API_URL", None)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Pharma Insights API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ Models ============

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drug_name: str
    category: str
    units_sold: int
    revenue: float
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Insight(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    priority: str
    drug_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ Helper Functions ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============ Auth Routes ============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = User(email=user_data.email, name=user_data.name)
    user_dict = user.model_dump()
    user_dict['password_hash'] = get_password_hash(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={"id": user.id, "email": user.email, "name": user.name}
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={"id": user['id'], "email": user['email'], "name": user['name']}
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ============ Sales Routes ============

# Mock pharmacy sales data
DRUGS_DATA = [
    {"name": "Paracetamol", "category": "Pain Relief", "base_price": 5.99},
    {"name": "Amoxicillin", "category": "Antibiotics", "base_price": 12.99},
    {"name": "Omeprazole", "category": "Digestive", "base_price": 8.49},
    {"name": "Metformin", "category": "Diabetes", "base_price": 15.99},
    {"name": "Lisinopril", "category": "Cardiovascular", "base_price": 18.99},
    {"name": "Atorvastatin", "category": "Cardiovascular", "base_price": 22.49},
    {"name": "Ibuprofen", "category": "Pain Relief", "base_price": 6.99},
    {"name": "Ciprofloxacin", "category": "Antibiotics", "base_price": 14.99},
    {"name": "Amlodipine", "category": "Cardiovascular", "base_price": 16.99},
    {"name": "Gabapentin", "category": "Neurological", "base_price": 24.99},
]

def generate_mock_sales_data():
    """Generate 6 months of daily sales data"""
    sales = []
    base_date = datetime.now(timezone.utc)
    
    for days_ago in range(180):  # 6 months
        date = base_date - timedelta(days=days_ago)
        date_str = date.strftime("%Y-%m-%d")
        
        for drug in DRUGS_DATA:
            # Generate varying sales with some seasonality
            base_units = random.randint(50, 200)
            # Add some variation based on day of week
            day_factor = 1.2 if date.weekday() < 5 else 0.8
            # Add some random noise
            units = int(base_units * day_factor * random.uniform(0.7, 1.3))
            revenue = round(units * drug['base_price'] * random.uniform(0.9, 1.1), 2)
            
            sales.append({
                "id": str(uuid.uuid4()),
                "drug_name": drug['name'],
                "category": drug['category'],
                "units_sold": units,
                "revenue": revenue,
                "date": date_str
            })
    
    return sales

@api_router.get("/sales")
async def get_sales(
    days: int = 30,
    drug: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Fetch mock pharmacy sales data"""
    all_sales = generate_mock_sales_data()
    
    # Filter by days
    filtered_sales = all_sales[:days * len(DRUGS_DATA)]
    
    # Filter by drug if specified
    if drug:
        filtered_sales = [s for s in filtered_sales if s['drug_name'].lower() == drug.lower()]
    
    return {"sales": filtered_sales, "total": len(filtered_sales)}

@api_router.get("/sales/metrics")
async def get_sales_metrics(current_user: dict = Depends(get_current_user)):
    """Get aggregated sales metrics"""
    all_sales = generate_mock_sales_data()
    
    # Last 30 days
    recent_sales = all_sales[:30 * len(DRUGS_DATA)]
    
    total_revenue = sum(s['revenue'] for s in recent_sales)
    total_units = sum(s['units_sold'] for s in recent_sales)
    avg_daily_demand = total_units / 30
    
    # Top 5 drugs by revenue
    drug_revenues = {}
    drug_units = {}
    for sale in recent_sales:
        drug_revenues[sale['drug_name']] = drug_revenues.get(sale['drug_name'], 0) + sale['revenue']
        drug_units[sale['drug_name']] = drug_units.get(sale['drug_name'], 0) + sale['units_sold']
    
    top_drugs = sorted(drug_revenues.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Category breakdown
    category_data = {}
    for sale in recent_sales:
        if sale['category'] not in category_data:
            category_data[sale['category']] = {'revenue': 0, 'units': 0}
        category_data[sale['category']]['revenue'] += sale['revenue']
        category_data[sale['category']]['units'] += sale['units_sold']
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_units": total_units,
        "avg_daily_demand": round(avg_daily_demand, 2),
        "top_drugs": [
            {"name": name, "revenue": round(rev, 2), "units": drug_units[name]} 
            for name, rev in top_drugs
        ],
        "categories": [
            {"name": cat, "revenue": round(data['revenue'], 2), "units": data['units']}
            for cat, data in category_data.items()
        ],
        "period": "Last 30 days"
    }

@api_router.get("/sales/trends")
async def get_sales_trends(
    drug: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get daily sales trends for charts"""
    all_sales = generate_mock_sales_data()
    recent_sales = all_sales[:60 * len(DRUGS_DATA)]  # Last 60 days
    
    # Group by date
    daily_data = {}
    for sale in recent_sales:
        if drug and sale['drug_name'].lower() != drug.lower():
            continue
        if sale['date'] not in daily_data:
            daily_data[sale['date']] = {'units': 0, 'revenue': 0}
        daily_data[sale['date']]['units'] += sale['units_sold']
        daily_data[sale['date']]['revenue'] += sale['revenue']
    
    sorted_dates = sorted(daily_data.keys())
    
    return {
        "dates": sorted_dates,
        "units": [daily_data[d]['units'] for d in sorted_dates],
        "revenue": [round(daily_data[d]['revenue'], 2) for d in sorted_dates]
    }


# ============ Predict Routes (ML Integration) ============

@api_router.get("/predict")
async def get_forecast(
    drug: Optional[str] = None,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get demand forecast - integrates with external ML API if available"""
    if ML_API_URL:
        try:
            response = requests.get(f"{ML_API_URL}/predict", params={"drug": drug, "days": days})
            return response.json()
        except Exception:
            return {"error": "Failed to fetch from external ML API", "status": "error"}
    
    # Mock SARIMA-style forecast data
    all_sales = generate_mock_sales_data()
    recent_sales = all_sales[:60 * len(DRUGS_DATA)]
    
    # Get historical data grouped by date
    daily_data = {}
    for sale in recent_sales:
        if drug and sale['drug_name'].lower() != drug.lower():
            continue
        if sale['date'] not in daily_data:
            daily_data[sale['date']] = 0
        daily_data[sale['date']] += sale['units_sold']
    
    sorted_dates = sorted(daily_data.keys())
    actual_values = [daily_data[d] for d in sorted_dates]
    
    # Generate mock predictions (simple moving average with trend)
    if len(actual_values) > 7:
        avg = sum(actual_values[-7:]) / 7
        trend = (actual_values[-1] - actual_values[-7]) / 7 if len(actual_values) > 7 else 0
    else:
        avg = sum(actual_values) / len(actual_values) if actual_values else 100
        trend = 0
    
    # Generate future dates and predictions
    last_date = datetime.strptime(sorted_dates[-1], "%Y-%m-%d") if sorted_dates else datetime.now(timezone.utc)
    future_dates = []
    predicted_values = []
    
    for i in range(1, days + 1):
        future_date = last_date + timedelta(days=i)
        future_dates.append(future_date.strftime("%Y-%m-%d"))
        # Add some randomness to predictions
        pred = avg + (trend * i) + random.uniform(-avg * 0.1, avg * 0.1)
        predicted_values.append(max(0, int(pred)))
    
    return {
        "historical_dates": sorted_dates[-30:],
        "historical_values": actual_values[-30:],
        "forecast_dates": future_dates,
        "predicted": predicted_values,
        "drug": drug or "All Drugs",
        "status": "mock",
        "model": "SARIMA (Mock)",
        "confidence_interval": {
            "lower": [max(0, int(v * 0.85)) for v in predicted_values],
            "upper": [int(v * 1.15) for v in predicted_values]
        }
    }


# ============ Insights Routes ============

MOCK_INSIGHTS = [
    {
        "id": "1",
        "title": "Increase Paracetamol Stock",
        "description": "Based on historical trends and seasonal patterns, demand for Paracetamol is expected to increase by 25% in Q1. Consider increasing stock levels by 30% to meet anticipated demand.",
        "category": "Inventory",
        "priority": "high",
        "drug_name": "Paracetamol"
    },
    {
        "id": "2",
        "title": "Antibiotic Sales Declining",
        "description": "Amoxicillin sales have decreased by 15% over the past month. This may be due to seasonal factors or competition. Consider promotional activities or price adjustments.",
        "category": "Sales",
        "priority": "medium",
        "drug_name": "Amoxicillin"
    },
    {
        "id": "3",
        "title": "Cardiovascular Category Growth",
        "description": "The cardiovascular drug category shows consistent 8% month-over-month growth. Expand product range and ensure adequate stock of Lisinopril and Atorvastatin.",
        "category": "Growth",
        "priority": "high",
        "drug_name": None
    },
    {
        "id": "4",
        "title": "Optimize Omeprazole Pricing",
        "description": "Price elasticity analysis suggests Omeprazole can sustain a 5% price increase without significant demand reduction. Potential additional revenue: $2,400/month.",
        "category": "Pricing",
        "priority": "medium",
        "drug_name": "Omeprazole"
    },
    {
        "id": "5",
        "title": "Weekend Staffing Adjustment",
        "description": "Sales data shows 20% lower foot traffic on weekends. Consider reducing weekend staff hours to optimize labor costs while maintaining service quality.",
        "category": "Operations",
        "priority": "low",
        "drug_name": None
    },
    {
        "id": "6",
        "title": "Gabapentin Stockout Risk",
        "description": "Current inventory levels for Gabapentin may not meet projected demand in the next 2 weeks. Reorder immediately to prevent stockout.",
        "category": "Inventory",
        "priority": "critical",
        "drug_name": "Gabapentin"
    },
    {
        "id": "7",
        "title": "Bundle Promotion Opportunity",
        "description": "Customers frequently purchase Ibuprofen and Omeprazole together. Create a bundle deal to increase average transaction value by an estimated 12%.",
        "category": "Marketing",
        "priority": "medium",
        "drug_name": None
    },
    {
        "id": "8",
        "title": "Diabetes Category Expansion",
        "description": "Metformin demand is stable with high customer loyalty. Consider expanding the diabetes product line with complementary items like glucose monitors.",
        "category": "Growth",
        "priority": "low",
        "drug_name": "Metformin"
    }
]

@api_router.get("/insights")
async def get_insights(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered recommendations and insights"""
    insights = MOCK_INSIGHTS.copy()
    
    if category:
        insights = [i for i in insights if i['category'].lower() == category.lower()]
    
    if priority:
        insights = [i for i in insights if i['priority'].lower() == priority.lower()]
    
    # Sort by priority
    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    insights.sort(key=lambda x: priority_order.get(x['priority'], 4))
    
    return {"insights": insights, "total": len(insights)}

@api_router.get("/drugs")
async def get_drugs(current_user: dict = Depends(get_current_user)):
    """Get list of all drugs"""
    return {"drugs": DRUGS_DATA}


# ============ Root Route ============

@api_router.get("/")
async def root():
    return {"message": "Pharma Insights API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "ml_api_configured": ML_API_URL is not None}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
