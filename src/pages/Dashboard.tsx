import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Package, Truck, Clock, Settings, LogOut, Menu, X, Globe, Plus, Trash2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation, Language } from "../lib/i18n";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkBatch, setBulkBatch] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  
  const [profile, setProfile] = useState<any>(null);
  
  // New single draft state
  const [draft, setDraft] = useState({
    destination: "",
    cost: 50,
    tracking_id: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      setLoading(false);
      fetchRegions();
      fetchProfile();
    }
  }, [navigate]);

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

  const fetchRegions = async () => {
    try {
      const res = await fetch("/api/regions");
      const data = await res.json();
      setRegions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const addToBatch = () => {
    if (!draft.destination || !draft.tracking_id) return;
    setBulkBatch([...bulkBatch, { ...draft, id: Math.random().toString(36).substr(2, 9) }]);
    setDraft({ destination: "", cost: 50, tracking_id: "" });
  };

  const removeFromBatch = (id: string) => {
    setBulkBatch(bulkBatch.filter(b => b.id !== id));
  };

  const submitBatch = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orders: bulkBatch })
      });
      if (res.ok) {
        setBulkBatch([]);
        setShowBulkModal(false);
        // Alert success or refresh orders
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const mockShipments = [
    { id: "SHP-10442", dest: "Europe", status: "In Transit", method: "Express Air", date: "2026-04-28", cost: "$54.20" },
    { id: "SHP-10441", dest: "North America", status: "Delivered", method: "Standard Ground", date: "2026-04-25", cost: "$24.00" },
    { id: "SHP-10440", dest: "Europe", status: "Processing", method: "Express Air", date: "2026-04-29", cost: "$112.50" },
  ];

  return (
    <div className="flex-1 w-full flex flex-col md:flex-row bg-[#F1F5F9] min-h-screen" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Sidebar - Desktop */}
      <aside className={`w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 ${isRtl ? 'border-l border-r-0' : 'border-r'}`}>
        <div className="p-6 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
             <h2 className="font-bold tracking-tight text-xl text-slate-900">ShipControl</h2>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{isAdmin ? t('business_panel') : t('user_profile')}</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <a href="#" className={`relative flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium cursor-pointer`}>
            <div className={`w-1 h-full absolute ${isRtl ? 'right-0' : 'left-0'} bg-blue-600 rounded-r`}></div>
            <Package className="h-5 w-5" /> {t('orders')}
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
            <Settings className="h-5 w-5" /> {t('settings')}
          </a>
        </nav>
        <div className="p-4 mt-auto">
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <p className="text-xs text-slate-400 mb-1">{t('current_session') || 'Current Session'}</p>
            <p className="text-sm font-medium">{profile?.name || t('user_label')}</p>
            <button onClick={handleLogout} className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition-colors flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h2 className="font-bold text-slate-900 text-lg">{t('menu')}</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
               <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold">
                <Package className="h-5 w-5" /> {t('orders')}
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl font-semibold hover:bg-slate-50">
                <Settings className="h-5 w-5" /> {t('settings')}
              </a>
            </nav>
            <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50">
               <div className={`flex items-center gap-3 mb-4 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                 <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                   {profile?.name?.[0].toUpperCase() || t('user_label')[0].toUpperCase()}
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-900">{profile?.name || t('user_label')}</p>
                   <p className="text-xs text-slate-500 uppercase tracking-tighter">{profile?.role}</p>
                 </div>
               </div>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-3 bg-white text-red-600 border border-red-100 rounded-xl font-bold shadow-sm">
                <LogOut className="h-5 w-5" /> {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-slate-900 md:font-semibold md:text-slate-500 uppercase tracking-widest text-[10px] md:text-xs">
              {isAdmin ? t('business_panel') : t('user_profile')}
            </span>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} 
               className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
               title={lang === 'ar' ? 'English' : 'العربية'}
             >
               <Globe className="h-5 w-5" />
             </button>
             <Link to="/order" className="px-4 py-2 text-xs md:text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
              + {t('add_new')} <span className="hidden sm:inline">{t('orders')}</span>
            </Link>
          </div>
        </header>

        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBulkModal(false)}></div>
            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('bulk_shipments')}</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('draft_orders')}: {bulkBatch.length}</p>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Draft Entry */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                   <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Tracking ID</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="TRK-..."
                        value={draft.tracking_id}
                        onChange={e => setDraft({...draft, tracking_id: e.target.value})}
                      />
                   </div>
                   <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">{t('destination')}</label>
                      <select 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none border-r-[10px] border-transparent"
                        value={draft.destination}
                        onChange={e => setDraft({...draft, destination: e.target.value})}
                      >
                         <option value="">Select Region</option>
                         {regions.map(r => <option key={r.id} value={r.name}>{lang === 'ar' && r.metas?.['ar:title'] ? r.metas['ar:title'] : r.name}</option>)}
                      </select>
                   </div>
                   <button 
                     onClick={addToBatch}
                     className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                   >
                     <Plus className="h-3 w-3" /> {t('add_to_batch')}
                   </button>
                </div>

                {/* Batch List */}
                <div className="space-y-2">
                  {bulkBatch.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                           <Package className="h-4 w-4" />
                         </div>
                         <div>
                           <p className="text-xs font-black text-slate-900">{item.tracking_id}</p>
                           <p className="text-[10px] text-slate-500 font-bold">{item.destination}</p>
                         </div>
                      </div>
                      <button onClick={() => removeFromBatch(item.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {bulkBatch.length === 0 && (
                    <div className="text-center py-10 opacity-30 italic text-sm">No items in current batch</div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setBulkBatch([])}
                  className="px-6 py-3 border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white transition-all"
                >
                  {t('clear_batch')}
                </button>
                <button 
                  disabled={bulkBatch.length === 0}
                  onClick={submitBatch}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  <Send className="h-3 w-3" /> {t('submit_batch')}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="p-4 md:p-8 flex-1 overflow-auto">
           <div className="max-w-6xl mx-auto flex flex-col gap-6">
             {/* Stats */}
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 transition-transform hover:translate-y-[-2px]">
                 <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                   <Package className="h-5 w-5 md:h-6 md:w-6" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Active</p>
                   <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">12</p>
                 </div>
               </div>
               <div className="bg-white p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 transition-transform hover:translate-y-[-2px]">
                 <div className="h-10 w-10 md:h-12 md:w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                   <Clock className="h-5 w-5 md:h-6 md:w-6" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pending</p>
                   <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">3</p>
                 </div>
               </div>
               <div className="bg-white p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm md:flex items-center gap-3 md:gap-4 col-span-2 lg:col-span-1 hidden lg:flex transition-transform hover:translate-y-[-2px]">
                 <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                   <Truck className="h-5 w-5 md:h-6 md:w-6" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Completed</p>
                   <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">142</p>
                 </div>
               </div>
             </div>

             {/* Table/Cards */}
             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="px-5 py-4 md:px-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-bold text-sm md:text-base text-slate-900">{t('orders')}</h2>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Live</span>
                  </div>
                </div>
                
                {/* Desktop View */}
                <div className="p-0 overflow-x-auto hidden md:block">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="text-[10px] md:text-[11px] text-slate-400 uppercase border-b border-slate-100">
                        <th className="px-5 py-4 font-bold tracking-widest">ID</th>
                        <th className="px-5 py-4 font-bold tracking-widest">{t('status')}</th>
                        <th className="px-5 py-4 font-bold tracking-widest">{t('destination')}</th>
                        <th className="px-5 py-4 font-bold tracking-widest">{t('status')}</th>
                        <th className="px-5 py-4 font-bold tracking-widest text-right">{t('cost')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs md:text-sm text-slate-600 font-medium">
                      {mockShipments.map(s => (
                        <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-5 font-bold text-slate-900">{s.id}</td>
                          <td className="px-5 py-5 text-slate-500">{s.date}</td>
                          <td className="px-5 py-5 font-bold">{s.dest}</td>
                          <td className="px-5 py-5">
                             <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
                                s.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                s.status === 'In Transit' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                'bg-amber-50 text-amber-700 border-amber-100'
                             }`}>
                               {s.status}
                             </span>
                          </td>
                          <td className="px-5 py-5 text-right text-blue-600 font-black">{s.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                   {mockShipments.map(s => (
                     <div key={s.id} className="p-5 space-y-4">
                       <div className="flex justify-between items-start">
                         <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
                           <p className="text-sm font-black text-slate-900">{s.id}</p>
                         </div>
                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                            s.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            s.status === 'In Transit' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {s.status}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('destination')}</p>
                            <p className="text-xs font-bold text-slate-700">{s.dest}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('cost')}</p>
                            <p className="text-xs font-black text-blue-600">{s.cost}</p>
                          </div>
                       </div>
                     </div>
                   ))}
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                  <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View All Shipments</button>
                </div>
             </div>
           </div>
        </section>
      </main>
    </div>
  );
}
