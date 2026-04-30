import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Package, Settings, LogOut, User, Shield, Truck, Home, Plus, ChevronRight, Globe, Mail, Phone, ExternalLink, List, LayoutDashboard, ArrowLeft, Clock, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../lib/i18n";
import { Card } from "../components/Card";
import { OrderList } from "../components/OrderList";
import { hasPermission } from "../lib/permissions";

export default function Profile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t, isRtl, lang, setLanguage } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(() => {
    const cached = localStorage.getItem("cached_profile");
    return cached ? JSON.parse(cached) : null;
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const match = pathname.match(/\/profile\/(general|orders|provider)/);
  const activeTab = match ? match[1] : 'general';

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchProfile();
      // If we have cached profile, we can stop "hard" loading immediately
      if (profile) {
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
      fetchProviders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (profile?.id) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', userId: profile.id }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'alert') {
          setAlerts(prev => [{ ...data, id: Date.now() }, ...prev]);
        }
      };

      return () => socket.close();
    }
  }, [profile?.id]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/orders", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      } else {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
        const text = await res.text();
        console.error("Fetch orders failed:", res.status, text);
      }
    } catch (e) {
      console.error("Fetch orders error:", e);
    }
  };

  const fetchProviders = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/providers", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setProviders(data);
      } else {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
        const text = await res.text();
        console.error("Fetch providers failed:", res.status, text);
      }
    } catch (e) {
      console.error("Fetch providers error:", e);
    }
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        localStorage.setItem("cached_profile", JSON.stringify(data));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("cached_profile");
        navigate("/login");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cached_profile");
    setProfile(null);
    navigate("/");
  };

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const canViewOrders = hasPermission(profile?.permissions, 'orders:read');
  const canUpdateFleet = hasPermission(profile?.permissions, 'orders:update_status');
  const isAdmin = hasPermission(profile?.permissions, 'analytics:read') || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Real-time Alerts */}
      <div className="fixed bottom-6 right-6 z-[60] space-y-3 pointer-events-none w-80">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 pointer-events-auto animate-in slide-in-from-right duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">New Alert</p>
                 <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
              </div>
              <button 
                onClick={() => removeAlert(alert.id)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <header className="w-full h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Home">
            <Home className="h-5 w-5" />
          </Link>
          <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
          <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">{t('profile_page')}</h1>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={handleLogout}
             className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
             title={t('logout')}
           >
             <LogOut className="h-5 w-5" />
           </button>
        </div>
      </header>

      <main className="w-full max-w-5xl p-4 md:p-12 space-y-8">
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Hero Profile Card */}
            <Card className="p-2 border-0 shadow-xl shadow-slate-200/50">
               <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[1.8rem] p-8 md:p-12 text-white relative overflow-hidden group">
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                  <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex-shrink-0 flex items-center justify-center text-white text-4xl md:text-5xl font-black shadow-2xl">
                    {profile?.name?.[0]?.toUpperCase() || <User className="h-12 w-12" />}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                      <h2 className="text-3xl md:text-4xl font-black tracking-tighter">{profile?.name}</h2>
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/90 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                        {profile?.role}
                      </span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 text-white/60 font-medium text-xs mb-6">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{profile?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${profile?.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                        <span className="uppercase tracking-widest text-[10px] font-bold">{profile?.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      {isAdmin && (
                        <Link to="/admin" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg active:scale-95">
                          <Shield className="h-4 w-4" /> {t('admin_panel')}
                        </Link>
                      )}
                      <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
               </div>
            </Card>

            {/* Tabs Header */}
            <div className="flex flex-wrap gap-2 md:gap-4 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
               <Link 
                 to="/profile/general"
                 className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 <Settings className="h-4 w-4" />
                 {t('general_settings')}
               </Link>
               <Link 
                 to="/profile/orders"
                 className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 <Package className="h-4 w-4" />
                 {t('orders')}
               </Link>
               {canUpdateFleet && (
                 <Link 
                   to="/profile/provider"
                   className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'provider' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                   <Truck className="h-4 w-4" />
                   {t('provider_settings')}
                 </Link>
               )}
            </div>

            {/* Content Area */}
            <div className="w-full">
               <Card className="min-h-[400px]">
                  <Routes>
                    <Route index element={
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4">
                          <div className="h-1.5 w-12 bg-blue-600 rounded-full"></div>
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Account Identity</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                            <input type="text" defaultValue={profile?.name} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                            <input type="email" defaultValue={profile?.email} disabled className="w-full px-5 py-3 bg-slate-100 border border-slate-100 rounded-xl font-bold text-slate-400 cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                            <input type="tel" defaultValue="+968 0000 0000" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Language</label>
                            <select className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                              <option value="en">English</option>
                              <option value="ar">العربية</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-50 flex justify-end">
                          <button className="px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95">Update Profile</button>
                        </div>
                      </div>
                    } />
                    <Route path="general" element={<Navigate to="/profile" replace />} />
                    
                    <Route path="orders" element={
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4">
                          <div className="h-1.5 w-12 bg-blue-600 rounded-full"></div>
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Execution History</h3>
                        </div>
                        <OrderList 
                          orders={orders} 
                          canAssign={isAdmin}
                          canUpdateStatus={canUpdateFleet}
                          providers={providers}
                          onAssign={async (orderId, providerId) => {
                            const token = localStorage.getItem("token");
                            await fetch("/api/assign-order", {
                              method: "POST",
                              headers: { 
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                              },
                              body: JSON.stringify({ orderId, providerId })
                            });
                            fetchOrders();
                          }}
                          onStatusUpdate={async (orderId, status) => {
                            const token = localStorage.getItem("token");
                            await fetch(`/api/orders/${orderId}/status`, {
                              method: "PATCH",
                              headers: { 
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                              },
                              body: JSON.stringify({ status })
                            });
                            fetchOrders();
                          }}
                        />
                      </div>
                    } />

                    {canUpdateFleet && (
                      <Route path="provider" element={
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center gap-4">
                            <div className="h-1.5 w-12 bg-indigo-600 rounded-full"></div>
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Fleet Management</h3>
                          </div>

                          {/* Stats Summary moved from Dashboard */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="p-4 border border-slate-100 flex flex-col items-center text-center gap-2">
                               <Package className="h-5 w-5 text-blue-600" />
                               <div className="space-y-0.5">
                                 <p className="text-xl font-black text-slate-900">12</p>
                                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Active Orders</p>
                               </div>
                            </Card>
                            <Card className="p-4 border border-slate-100 flex flex-col items-center text-center gap-2">
                               <Clock className="h-5 w-5 text-amber-600" />
                               <div className="space-y-0.5">
                                 <p className="text-xl font-black text-slate-900">3</p>
                                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Pending</p>
                               </div>
                            </Card>
                            <Card className="p-4 border border-slate-100 flex flex-col items-center text-center gap-2 hidden lg:flex">
                               <Truck className="h-5 w-5 text-emerald-600" />
                               <div className="space-y-0.5">
                                 <p className="text-xl font-black text-slate-900">142</p>
                                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Completed</p>
                               </div>
                            </Card>
                          </div>

                          {/* Recent Alerts from Dashboard */}
                          {alerts.length > 0 && (
                            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
                               <div className="flex items-center gap-3 mb-4">
                                 <Clock className="h-6 w-6 text-indigo-200" />
                                 <h3 className="font-black uppercase tracking-tight text-lg">Recent Alerts</h3>
                               </div>
                               <div className="space-y-3">
                                 {alerts.slice(0, 3).map(alert => (
                                   <div key={alert.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                     <p className="text-sm font-medium">{alert.message}</p>
                                     <p className="text-[10px] text-indigo-200 mt-2 font-bold uppercase tracking-widest">{new Date(alert.id).toLocaleTimeString()}</p>
                                   </div>
                                 ))}
                               </div>
                            </div>
                          )}

                          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-6">
                            <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                              <Truck className="h-7 w-7" />
                            </div>
                            <div className="flex-1">
                              <p className="text-indigo-900 font-bold text-lg leading-tight uppercase">Active Logistics Node</p>
                              <p className="text-indigo-600/70 text-[10px] font-black mt-1 uppercase tracking-widest">Status: Monitoring Fleet</p>
                            </div>
                            <button className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                              <ExternalLink className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Capacity</label>
                              <input type="number" defaultValue="45" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fleet Response Rate</label>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
                                <div className="bg-indigo-500 h-full w-[92%]"></div>
                              </div>
                              <p className="text-right text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">92% Optimal</p>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-slate-50 flex justify-end">
                            <button className="px-8 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95">Sync Fleet Data</button>
                          </div>
                        </div>
                      } />
                    )}
                  </Routes>
                </Card>
            </div>
          </div>
      </main>
    </div>
  );
}
