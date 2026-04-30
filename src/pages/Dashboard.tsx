import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Package, Truck, Clock, Settings, LogOut, Menu, X, Globe, Plus, Trash2, Send, User, Shield, Home, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation, Language } from "../lib/i18n";
import { Card } from "../components/Card";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      setLoading(false);
      fetchProfile();
    }
  }, [navigate]);

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
  }, [profile]);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const isProvider = profile?.role === 'provider';

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-[#F1F5F9] min-h-screen" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
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
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h2 className="font-bold tracking-tight text-xl text-slate-900">ShipControl</h2>
            <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px] hidden sm:block">
              {t('dashboard')}
            </span>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} 
               className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
               title={lang === 'ar' ? 'English' : 'العربية'}
             >
                <Globe className="h-5 w-5" />
             </button>
             {isAdmin && (
               <Link to="/admin" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title={t('admin_panel')}>
                 <Shield className="h-5 w-5" />
               </Link>
             )}
             <Link to="/profile/general" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title={t('profile_page')}>
               <User className="h-5 w-5" />
             </Link>
             <button 
               onClick={handleLogout}
               className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
               title={t('logout')}
             >
               <LogOut className="h-5 w-5" />
             </button>
          </div>
        </header>

        <section className="p-4 md:p-8 flex-1 overflow-auto">
           <div className="max-w-6xl mx-auto flex flex-col gap-6">
             {/* Alerts History for Provider */}
             {isProvider && alerts.length > 0 && (
               <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-6 w-6 text-blue-200" />
                    <h3 className="font-black uppercase tracking-tight text-lg">Recent Alerts</h3>
                  </div>
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-[10px] text-blue-200 mt-2 font-bold uppercase tracking-widest">{new Date(alert.id).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {/* Stats */}
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card
                  title="Active"
                  subtitle="Orders"
                  icon={<Package className="h-5 w-5 md:h-6 md:w-6" />}
                  className="md:h-24 flex items-center"
                >
                  <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">12</p>
                </Card>
                <Card
                  title="Pending"
                  subtitle="Orders"
                  icon={<Clock className="h-5 w-5 md:h-6 md:w-6" />}
                  className="md:h-24 flex items-center"
                >
                  <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">3</p>
                </Card>
                <Card
                  title="Completed"
                  subtitle="Orders"
                  icon={<Truck className="h-5 w-5 md:h-6 md:w-6" />}
                  className="md:h-24 flex items-center hidden lg:flex"
                >
                  <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">142</p>
                </Card>
             </div>

              {/* Operational Overview */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                 <div className="px-5 py-4 md:px-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                   <h2 className="font-bold text-sm md:text-base text-slate-900">Operational Overview</h2>
                   <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Active</span>
                   </div>
                 </div>
                 
                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link to="/profile/orders" className="p-6 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all group">
                      <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                        <Package className="h-6 w-6" />
                      </div>
                      <h3 className="font-black uppercase tracking-tight text-slate-900">Manage Orders</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Track shipping lifecycle and history</p>
                    </Link>

                    <Link to="/order" className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all group">
                      <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                        <Plus className="h-6 w-6" />
                      </div>
                      <h3 className="font-black uppercase tracking-tight text-slate-900">Create Shipment</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Initialize new logistic operation</p>
                    </Link>
                 </div>

                 <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                   <Link to="/profile/orders" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">
                     Open Comprehensive Management Panel
                   </Link>
                 </div>
              </div>
           </div>
        </section>
      </main>
    </div>
  );
}
