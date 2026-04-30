import React, { useState, useEffect } from "react";
import { LogIn, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(next === "/" ? "/profile" : next);
    }
  }, [navigate, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        navigate(next);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-auto bg-[#F1F5F9]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <Home className="h-5 w-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2 text-blue-600 mb-1">
               <h2 className="font-bold tracking-tight text-xl text-slate-900">Logistics Engine</h2>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/admin" className="text-sm font-semibold hover:text-blue-600 transition-colors">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-sm border border-slate-200">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
              <LogIn className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Console</h2>
            <p className="mt-2 text-sm text-slate-500">
              Authorized personnel only. <Link to="/order" className="font-medium text-blue-600 hover:text-blue-500">Or continue as guest</Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-t-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-slate-50"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 border-t-0 placeholder-slate-400 text-slate-900 rounded-b-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-slate-50"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 shadow-sm shadow-blue-200"
              >
                {loading ? "Authenticating..." : "Sign in"}
              </button>
            </div>
          </form>

          {/* Demo Helpers */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center mb-4">Seeded Oman Demo Accounts</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => { setEmail("admin@ship.om"); setPassword("password123"); }}
                className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-all border border-slate-200 flex items-center justify-between"
              >
                <span>Admin (All access)</span>
                <span className="text-[10px] font-medium opacity-60">admin@ship.om</span>
              </button>
              <button 
                onClick={() => { setEmail("manager@ship.om"); setPassword("password123"); }}
                className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-all border border-slate-200 flex items-center justify-between"
              >
                <span>Manager (Ops)</span>
                <span className="text-[10px] font-medium opacity-60">manager@ship.om</span>
              </button>
              <button 
                onClick={() => { setEmail("customer@ship.om"); setPassword("password123"); }}
                className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-all border border-slate-200 flex items-center justify-between"
              >
                <span>User (Customer)</span>
                <span className="text-[10px] font-medium opacity-60">customer@ship.om</span>
              </button>
              <button 
                onClick={() => { setEmail("provider@ship.om"); setPassword("password123"); }}
                className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-all border border-slate-200 flex items-center justify-between"
              >
                <span>Provider (Cargo)</span>
                <span className="text-[10px] font-medium opacity-60">provider@ship.om</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-4 font-medium italic">Demo Password: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
