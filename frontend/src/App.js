import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import Plot from "react-plotly.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  LogOut,
  Menu,
  X,
  DollarSign,
  Package,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Pill,
  BarChart3,
  Settings,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("token", access_token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("token", access_token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Auth Page
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Welcome back!");
      } else {
        await register(name, email, password);
        toast.success("Account created successfully!");
      }
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 mb-4">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">Pharma Insights</h1>
          <p className="text-slate-600 mt-2">Analytics & Forecasting Dashboard</p>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{isLogin ? "Sign In" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Enter your credentials to access your dashboard" : "Fill in your details to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    data-testid="auth-name-input"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="h-11"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="auth-email-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                data-testid="auth-submit-btn"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                data-testid="auth-toggle-btn"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Navbar
const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/forecast", label: "Forecast", icon: TrendingUp },
    { path: "/insights", label: "Insights", icon: Lightbulb },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 hidden sm:block font-display">Pharma Insights</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              data-testid="logout-btn"
              onClick={logout}
              className="text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <button
              className="md:hidden p-2 text-slate-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
                  isActive(item.path)
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// Dashboard Page
const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, trendsRes] = await Promise.all([
        axios.get(`${API}/sales/metrics`),
        axios.get(`${API}/sales/trends`),
      ]);
      setMetrics(metricsRes.data);
      setTrends(trendsRes.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${metrics?.total_revenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      trend: "+12.5%",
      trendUp: true,
      color: "teal",
    },
    {
      title: "Units Sold",
      value: metrics?.total_units?.toLocaleString() || 0,
      icon: Package,
      trend: "+8.2%",
      trendUp: true,
      color: "blue",
    },
    {
      title: "Avg Daily Demand",
      value: metrics?.avg_daily_demand?.toLocaleString() || 0,
      icon: Activity,
      trend: "-2.1%",
      trendUp: false,
      color: "violet",
    },
    {
      title: "Active Products",
      value: "10",
      icon: Pill,
      trend: "+2",
      trendUp: true,
      color: "amber",
    },
  ];

  const colorMap = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Dashboard</h1>
          <p className="text-slate-600 mt-1">Overview of your pharmacy performance</p>
        </div>
        <Badge variant="outline" className="w-fit bg-teal-50 text-teal-700 border-teal-200">
          {metrics?.period}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${colorMap[stat.color]}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trendUp ? "text-emerald-600" : "text-red-500"
                }`}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the past 60 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trends && (
              <Plot
                data={[
                  {
                    x: trends.dates,
                    y: trends.revenue,
                    type: "scatter",
                    mode: "lines",
                    fill: "tozeroy",
                    line: { color: "#0d9488", width: 2 },
                    fillcolor: "rgba(13, 148, 136, 0.1)",
                  },
                ]}
                layout={{
                  margin: { t: 10, r: 20, l: 50, b: 40 },
                  height: 280,
                  xaxis: { showgrid: false, tickfont: { size: 11, color: "#64748b" } },
                  yaxis: { showgrid: true, gridcolor: "#f1f5f9", tickfont: { size: 11, color: "#64748b" }, tickprefix: "$" },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  hovermode: "x unified",
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Drugs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top 5 Products</CardTitle>
            <CardDescription>By revenue this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.top_drugs?.map((drug, idx) => (
                <div key={drug.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{drug.name}</p>
                    <p className="text-xs text-slate-500">{drug.units.toLocaleString()} units</p>
                  </div>
                  <p className="font-semibold text-slate-900">${drug.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Category Performance</CardTitle>
          <CardDescription>Revenue and units by drug category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics && (
              <>
                <Plot
                  data={[
                    {
                      values: metrics.categories.map((c) => c.revenue),
                      labels: metrics.categories.map((c) => c.name),
                      type: "pie",
                      hole: 0.5,
                      marker: {
                        colors: ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"],
                      },
                      textinfo: "percent",
                      textfont: { size: 12 },
                    },
                  ]}
                  layout={{
                    margin: { t: 20, r: 20, l: 20, b: 20 },
                    height: 250,
                    showlegend: true,
                    legend: { orientation: "h", y: -0.1, font: { size: 11 } },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%" }}
                />
                <div className="space-y-3">
                  {metrics.categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{cat.name}</p>
                        <p className="text-xs text-slate-500">{cat.units.toLocaleString()} units sold</p>
                      </div>
                      <p className="font-semibold text-teal-600">${cat.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Forecast Page
const ForecastPage = () => {
  const [forecast, setForecast] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrugs();
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [selectedDrug]);

  const fetchDrugs = async () => {
    try {
      const res = await axios.get(`${API}/drugs`);
      setDrugs(res.data.drugs);
    } catch (err) {
      toast.error("Failed to load drugs");
    }
  };

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const params = selectedDrug ? { drug: selectedDrug } : {};
      const res = await axios.get(`${API}/predict`, { params });
      setForecast(res.data);
    } catch (err) {
      toast.error("Failed to load forecast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="forecast-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Demand Forecast</h1>
          <p className="text-slate-600 mt-1">AI-powered demand predictions</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedDrug} onValueChange={setSelectedDrug}>
            <SelectTrigger className="w-48" data-testid="forecast-drug-select">
              <SelectValue placeholder="All Drugs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drugs</SelectItem>
              {drugs.map((drug) => (
                <SelectItem key={drug.name} value={drug.name}>
                  {drug.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {forecast?.status === "mock" && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Mock Data
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : forecast ? (
        <>
          {/* Main Forecast Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Actual vs Predicted Demand</CardTitle>
                  <CardDescription>Historical data and 30-day forecast for {forecast.drug}</CardDescription>
                </div>
                <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">
                  {forecast.model}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Plot
                data={[
                  {
                    x: forecast.historical_dates,
                    y: forecast.historical_values,
                    type: "scatter",
                    mode: "lines",
                    name: "Actual",
                    line: { color: "#0d9488", width: 2 },
                  },
                  {
                    x: forecast.forecast_dates,
                    y: forecast.predicted,
                    type: "scatter",
                    mode: "lines",
                    name: "Predicted",
                    line: { color: "#3b82f6", width: 2, dash: "dot" },
                  },
                  {
                    x: [...forecast.forecast_dates, ...forecast.forecast_dates.slice().reverse()],
                    y: [...forecast.confidence_interval.upper, ...forecast.confidence_interval.lower.slice().reverse()],
                    fill: "toself",
                    fillcolor: "rgba(59, 130, 246, 0.1)",
                    line: { color: "transparent" },
                    name: "Confidence Interval",
                    showlegend: true,
                    type: "scatter",
                  },
                ]}
                layout={{
                  margin: { t: 20, r: 40, l: 60, b: 50 },
                  height: 400,
                  xaxis: { 
                    showgrid: false, 
                    tickfont: { size: 11, color: "#64748b" },
                    title: { text: "Date", font: { size: 12, color: "#64748b" } }
                  },
                  yaxis: { 
                    showgrid: true, 
                    gridcolor: "#f1f5f9", 
                    tickfont: { size: 11, color: "#64748b" },
                    title: { text: "Units", font: { size: 12, color: "#64748b" } }
                  },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  legend: { orientation: "h", y: 1.1, font: { size: 12 } },
                  hovermode: "x unified",
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%" }}
              />
            </CardContent>
          </Card>

          {/* Forecast Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avg Predicted Demand</p>
                    <p className="text-xl font-bold text-slate-900">
                      {Math.round(forecast.predicted.reduce((a, b) => a + b, 0) / forecast.predicted.length).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Peak Demand Day</p>
                    <p className="text-xl font-bold text-slate-900">
                      {Math.max(...forecast.predicted).toLocaleString()} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50">
                    <Activity className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Forecast</p>
                    <p className="text-xl font-bold text-slate-900">
                      {forecast.predicted.reduce((a, b) => a + b, 0).toLocaleString()} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ML API Connection Info */}
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-slate-200">
                  <Settings className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Connect ML API</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Currently using mock SARIMA predictions. To connect a real ML microservice,
                    set the <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">ML_API_URL</code> environment variable.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Example: <code className="bg-slate-200 px-1.5 py-0.5 rounded">ML_API_URL=http://ml-service:5000</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

// Insights Page
const InsightsPage = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchInsights();
  }, [filter]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { priority: filter } : {};
      const res = await axios.get(`${API}/insights`, { params });
      setInsights(res.data.insights);
    } catch (err) {
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const categoryIcons = {
    Inventory: Package,
    Sales: DollarSign,
    Growth: TrendingUp,
    Pricing: DollarSign,
    Operations: Settings,
    Marketing: Lightbulb,
  };

  return (
    <div className="space-y-6" data-testid="insights-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">AI Insights</h1>
          <p className="text-slate-600 mt-1">Smart recommendations for your pharmacy</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="critical" data-testid="filter-critical">Critical</TabsTrigger>
            <TabsTrigger value="high" data-testid="filter-high">High</TabsTrigger>
            <TabsTrigger value="medium" data-testid="filter-medium">Medium</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const Icon = categoryIcons[insight.category] || Lightbulb;
            return (
              <Card key={insight.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-teal-50 shrink-0">
                      <Icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                        <Badge variant="outline" className={`shrink-0 ${priorityColors[insight.priority]}`}>
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                          {insight.category}
                        </Badge>
                        {insight.drug_name && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Pill className="w-3 h-3" />
                            {insight.drug_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && insights.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No insights found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filter to see more recommendations</p>
        </div>
      )}
    </div>
  );
};

// Layout
const Layout = ({ children }) => (
  <div className="min-h-screen bg-slate-50">
    <Navbar />
    <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {children}
    </main>
  </div>
);

// Main App
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/forecast"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ForecastPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InsightsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
