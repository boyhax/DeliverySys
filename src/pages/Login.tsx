import React, { useState } from "react";
import { LogIn, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        navigate("/dashboard");
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
          <Link to="/" className="flex items-center gap-2 text-blue-600 mb-1">
             <h2 className="font-bold tracking-tight text-xl text-slate-900">ShipControl</h2>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/admin" className="text-sm font-semibold hover:text-blue-600 transition-colors">
              Admin
            </Link>
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
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
        </div>
      </div>
    </div>
  );
}
