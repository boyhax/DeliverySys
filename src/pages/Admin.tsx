import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, Truck, Globe, Settings, LogOut, 
  Plus, Layers, MapPin, Activity, ShieldCheck,
  Menu, X, ChevronRight, ArrowLeft, BarChart3, Users as UsersIcon, ListOrdered,
  Search, Filter, MoreVertical, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useTranslation, Language } from "../lib/i18n";

type MainTab = "analytics" | "users" | "orders" | "delivery" | "settings";
type DeliverySubTab = "methods" | "regions" | "matrix" | "providers" | "eligibility";

export default function Admin() {
  const navigate = useNavigate();
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const [activeTab, setActiveTab] = useState<MainTab>("analytics");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table"); // Table by default for desktop, we'll use a responsive default in useEffect
  const [deliveryTab, setDeliveryTab] = useState<DeliverySubTab>("methods");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [metadata, setMetadata] = useState<any>({});
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setData(null); // Reset data when switching tabs to avoid stale data type mismatch
    if (activeTab !== "settings") {
      fetchData();
    } else {
      setLoading(false);
    }
    // Set default view mode based on screen size
    if (window.innerWidth < 768) {
      setViewMode("cards");
    }
  }, [activeTab, deliveryTab, navigate]);

  // Fetch metadata for forms
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };
      try {
        const [methods, regions, matrix, providers, classes] = await Promise.all([
          fetch("/api/admin/methods", { headers }).then(r => r.json()),
          fetch("/api/admin/regions", { headers }).then(r => r.json()),
          fetch("/api/admin/matrix", { headers }).then(r => r.json()),
          fetch("/api/admin/providers", { headers }).then(r => r.json()),
          fetch("/api/classes").then(r => r.json()),
        ]);
        setMetadata({ methods, regions, matrix, providers, classes });
      } catch (err) {
        console.error("Metadata fetch error:", err);
      }
    };
    if (isModalOpen) fetchMetadata();
  }, [isModalOpen]);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { "Authorization": `Bearer ${token}` };
    try {
      const endpoint = activeTab === "delivery" ? deliveryTab : activeTab;
      const res = await fetch(`/api/admin/${endpoint}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Fetch error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    setFormData(item || {});
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const getStepsForType = (t: string) => {
    if (t === "methods" || t === "matrix" || t === "users" || t === "orders" || t === "regions" || t === "providers") return 3;
    return 1;
  };

  const handleMetaChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      metas: {
        ...(prev.metas || {}),
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = activeTab === "delivery" ? deliveryTab : activeTab;
    const totalSteps = getStepsForType(type);

    if (currentStep < totalSteps) {
      setCurrentStep(s => s + 1);
      return;
    }

    const url = editingItem ? `/api/admin/${type}/${editingItem.id}` : `/api/admin/${type}`;
    const method = editingItem ? "PUT" : "POST";
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const type = activeTab === "delivery" ? deliveryTab : activeTab;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const mainNavItems = [
    { id: "analytics", label: t('analytics'), icon: BarChart3 },
    { id: "users", label: t('users'), icon: UsersIcon },
    { id: "orders", label: t('orders'), icon: ListOrdered },
    { id: "delivery", label: t('delivery'), icon: Truck },
    { id: "settings", label: t('settings'), icon: Settings },
  ];

  const deliveryNavItems = [
    { id: "methods", label: t('methods'), icon: Layers },
    { id: "regions", label: t('regions'), icon: Globe },
    { id: "matrix", label: t('matrix'), icon: Activity },
    { id: "providers", label: t('providers'), icon: ShieldCheck },
    { id: "eligibility", label: t('eligibility'), icon: ShieldCheck },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const renderAnalytics = () => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <h3 className="text-3xl font-black text-slate-900">${(data.totalRevenue || 0).toFixed(2)}</h3>
            <p className="text-xs text-green-500 font-bold mt-2">↑ 12.5% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
            <h3 className="text-3xl font-black text-slate-900">{data.orderCount || 0}</h3>
            <p className="text-xs text-blue-500 font-bold mt-2">Active tracking live</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Users</p>
            <h3 className="text-3xl font-black text-slate-900">{data.activeUsers || 0}</h3>
            <p className="text-xs text-slate-500 font-bold mt-2">98.2% retention rate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Shipping Distribution
              <span className="text-[10px] text-slate-400 font-bold uppercase">Last 30 Days</span>
            </h4>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.shippingDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(data.shippingDistribution || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Network Performance
              <span className="text-[10px] text-slate-400 font-bold uppercase">Volume Insights</span>
            </h4>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Mon', vol: 400 },
                  { name: 'Tue', vol: 300 },
                  { name: 'Wed', vol: 600 },
                  { name: 'Thu', vol: 800 },
                  { name: 'Fri', vol: 500 },
                  { name: 'Sat', vol: 200 },
                  { name: 'Sun', vol: 150 },
                ]}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} />
                  <Bar dataKey="vol" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!isModalOpen) return null;
    const type = activeTab === "delivery" ? deliveryTab : activeTab;
    const totalSteps = getStepsForType(type);

    const nextStep = () => setCurrentStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
        <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">Step {currentStep} of {totalSteps}</span>
                {totalSteps > 1 && (
                  <div className="flex gap-1 h-1 flex-1 max-w-[60px] bg-slate-200 rounded-full overflow-hidden">
                    {[...Array(totalSteps)].map((_, i) => (
                      <div key={i} className={`flex-1 ${i < currentStep ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                )}
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-tighter">
                {editingItem ? 'Update' : 'Register New'} {type}
              </h3>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Methods Form */}
            {type === "methods" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Method Name</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold" placeholder="e.g. Air Express" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping Class</label>
                      <select required value={formData.shipping_class_id || ''} onChange={e => {
                        const selectedClass = metadata.classes?.find((c: any) => c.id === e.target.value);
                        setFormData({...formData, shipping_class_id: e.target.value, shipping_class: selectedClass?.name || 'standard'});
                      }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold">
                        <option value="">Select System Class</option>
                        {metadata.classes?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Classification helps in sorting and prioritization</p>
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                       <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1 italic">Cost Definition</p>
                       <p className="text-xs text-blue-500/80 leading-relaxed font-medium">Define base handling fees and dynamic multipliers based on weight and volume metrics.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Handling ($)</label>
                      <input type="number" step="0.01" required value={formData.base_cost || ''} onChange={e => setFormData({...formData, base_cost: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per KG ($)</label>
                        <input type="number" step="0.01" required value={formData.cost_per_kg || ''} onChange={e => setFormData({...formData, cost_per_kg: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per M2 ($)</label>
                        <input type="number" step="0.01" required value={formData.cost_per_m2 || ''} onChange={e => setFormData({...formData, cost_per_m2: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                      </div>
                    </div>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Method Metadata</label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Arabic Title</label>
                        <input placeholder="العنوان بالعربية" value={formData.metas?.['ar:title'] || ''} onChange={e => handleMetaChange('ar:title', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Image URL</label>
                        <input placeholder="https://..." value={formData.metas?.image || ''} onChange={e => handleMetaChange('image', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Extra Info</label>
                        <input placeholder="Extra Info" value={formData.metas?.info || ''} onChange={e => handleMetaChange('info', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regions Form */}
            {type === "regions" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Name</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold" placeholder="e.g. North America" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country Code (ISO)</label>
                      <input required maxLength={2} value={formData.country_code || ''} onChange={e => setFormData({...formData, country_code: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-blue-500" placeholder="US" />
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Assets</label>
                    <input placeholder="Image URL" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Metas</label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Arabic Title</label>
                        <input placeholder="العنوان بالعربية" value={formData.metas?.['ar:title'] || ''} onChange={e => handleMetaChange('ar:title', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Notes</label>
                        <input placeholder="Notes" value={formData.metas?.notes || ''} onChange={e => handleMetaChange('notes', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Matrix Form */}
            {type === "matrix" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Origin</label>
                        <select required value={formData.from_region_id || ''} onChange={e => setFormData({...formData, from_region_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="">Select Origin</option>
                          {metadata.regions?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination</label>
                        <select required value={formData.to_region_id || ''} onChange={e => setFormData({...formData, to_region_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="">Select Destination</option>
                          {metadata.regions?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Method</label>
                      <select required value={formData.shipping_method_id || ''} onChange={e => setFormData({...formData, shipping_method_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                        <option value="">Select Method</option>
                        {metadata.methods?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-2">
                       <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1 italic">Route Overrides</p>
                       <p className="text-xs text-amber-500/80 leading-relaxed font-medium">Configure route-specific pricing that bypasses global method defaults.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Override ($)</label>
                      <input type="number" step="0.01" value={formData.base_cost_override || ''} onChange={e => setFormData({...formData, base_cost_override: e.target.value ? parseFloat(e.target.value) : null})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Default" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">KG Override</label>
                        <input type="number" step="0.01" value={formData.cost_per_kg_override || ''} onChange={e => setFormData({...formData, cost_per_kg_override: e.target.value ? parseFloat(e.target.value) : null})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Default" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">M2 Override</label>
                        <input type="number" step="0.01" value={formData.cost_per_m2_override || ''} onChange={e => setFormData({...formData, cost_per_m2_override: e.target.value ? parseFloat(e.target.value) : null})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Default" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Providers Form */}
            {type === "providers" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider Name</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                      <select required value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                        <option value="air">Air Freight</option>
                        <option value="sea">Maritime</option>
                        <option value="land">Ground Transport</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                      <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                        <option value="active">Active System</option>
                        <option value="suspended">Suspended Node</option>
                      </select>
                    </div>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider Metas</label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Arabic Title</label>
                        <input placeholder="العنوان بالعربية" value={formData.metas?.['ar:title'] || ''} onChange={e => handleMetaChange('ar:title', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Contact Person</label>
                        <input placeholder="Contact Person" value={formData.metas?.contact || ''} onChange={e => handleMetaChange('contact', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Eligibility Form */}
            {type === "eligibility" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</label>
                  <select required value={formData.provider_id || ''} onChange={e => setFormData({...formData, provider_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                    <option value="">Select Provider</option>
                    {metadata.providers?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matrix Entry (Route/Method)</label>
                  <select required value={formData.matrix_id || ''} onChange={e => setFormData({...formData, matrix_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                    <option value="">Select Route</option>
                    {metadata.matrix?.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.from_region_name} → {m.to_region_name} ({m.method_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <input type="checkbox" checked={!!formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} className="h-5 w-5 bg-white border border-slate-200 rounded focus:ring-blue-500" />
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Authorize Eligibility</label>
                </div>
              </div>
            )}

            {/* Users Form */}
            {type === "users" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                      <input type="email" required value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Role</label>
                        <select required value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="admin">Administrator</option>
                          <option value="manager">Operations Mgr</option>
                          <option value="client">Client Portal</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Status</label>
                        <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="active">Active Access</option>
                          <option value="inactive">Restricted</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Orders Form */}
            {type === "orders" && (
              <>
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tracking identifier</label>
                      <input required value={formData.tracking_id || ''} onChange={e => setFormData({...formData, tracking_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination Logistics Point</label>
                      <input required value={formData.destination || ''} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creator Type</label>
                      <select value={formData.metas?.creator_type || ''} onChange={e => handleMetaChange('creator_type', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                        <option value="pos">POS System</option>
                        <option value="customer">Customer Portal</option>
                      </select>
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lifecycle Status</label>
                        <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="draft">Draft</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="transit">Transit</option>
                          <option value="complete">Complete</option>
                          <option value="failed">Failed</option>
                          <option value="canceled">Canceled</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status</label>
                        <select required value={formData.payment_status || ''} onChange={e => setFormData({...formData, payment_status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
                          <option value="pending">Pending</option>
                          <option value="complete">Complete</option>
                          <option value="ondelivery">On Delivery</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculated Cost ($)</label>
                      <input type="number" step="0.01" required value={formData.cost || ''} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-600" />
                    </div>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto max-h-[300px] pr-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Image URL</label>
                      <input value={formData.metas?.image || ''} onChange={e => handleMetaChange('image', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel Reason (if applicable)</label>
                      <input value={formData.metas?.cancel_reason || ''} onChange={e => handleMetaChange('cancel_reason', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating (1-5)</label>
                        <input type="number" min="1" max="5" value={formData.metas?.customer_rating || ''} onChange={e => handleMetaChange('customer_rating', parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Comment</label>
                      <textarea value={formData.metas?.customer_comment || ''} onChange={e => handleMetaChange('customer_comment', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              {currentStep > 1 ? (
                <button type="button" onClick={prevStep} className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </button>
              ) : (
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
              )}
              
              {currentStep < totalSteps ? (
                <button type="submit" className="flex-[2] py-3.5 px-4 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  Continue Tracking <ChevronRight className="h-3 w-3" />
                </button>
              ) : (
                <button type="submit" className="flex-[2] py-3.5 px-4 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98]">
                  {editingItem ? 'Finalize Modification' : 'Deploy Global Entry'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderCards = (tab: string, items: any) => {
    if (!Array.isArray(items)) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No data available for this node</div>;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {tab === "methods" && item.metas?.image ? (
                  <img src={item.metas.image} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-100" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    {tab === "users" ? <UsersIcon className="h-5 w-5" /> : 
                     tab === "orders" ? <Package className="h-5 w-5" /> :
                     tab === "methods" ? <Layers className="h-5 w-5" /> :
                     tab === "regions" ? <Globe className="h-5 w-5" /> :
                     tab === "providers" ? <ShieldCheck className="h-5 w-5" /> :
                     <Activity className="h-5 w-5" />}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">
                    {lang === 'ar' && item.metas?.['ar:title'] ? item.metas['ar:title'] : (item.name || item.tracking_id)}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">#{item.id.substring(0, 8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {tab === "users" && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Email</span>
                    <span className="text-slate-700 font-semibold">{item.email}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Role</span>
                    <span className="text-slate-700 font-semibold capitalize bg-slate-100 px-1.5 py-0.5 rounded">{item.role}</span>
                  </div>
                </>
              )}

              {tab === "orders" && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">{t('destination')}</span>
                    <span className="text-slate-700 font-semibold truncate max-w-[150px]">{item.destination}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">{t('status')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      item.status === 'complete' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      item.status === 'canceled' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                    <span className="text-[14px] font-black text-slate-900">${(item.cost || 0).toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        item.payment_status === 'complete' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {item.payment_status || 'pending'}
                    </span>
                  </div>
                </>
              )}

              {tab === "methods" && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Class</span>
                    <span className="text-slate-700 font-semibold">{item.shipping_class}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[8px] text-slate-400 uppercase font-black">Base</p>
                      <p className="text-[10px] font-bold text-slate-900">${item.base_cost}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[8px] text-slate-400 uppercase font-black">/KG</p>
                      <p className="text-[10px] font-bold text-slate-900">${item.cost_per_kg}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[8px] text-slate-400 uppercase font-black">/M2</p>
                      <p className="text-[10px] font-bold text-slate-900">${item.cost_per_m2}</p>
                    </div>
                  </div>
                </>
              )}

              {tab === "regions" && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Country Code</span>
                    <span className="text-slate-700 font-bold tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{item.country_code}</span>
                  </div>
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-full h-24 object-cover rounded-xl mt-2 border border-slate-100" referrerPolicy="no-referrer" />
                  )}
                </>
              )}

              {tab === "providers" && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Type</span>
                    <span className="text-slate-700 font-semibold capitalize">{item.type}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Status</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase border border-emerald-100">
                      {item.status}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
               <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                 View Node <ChevronRight className={`h-3 w-3 ${isRtl ? 'rotate-180' : ''}`} />
               </button>
               {item.is_active !== undefined && (
                 <div className={`h-2 w-2 rounded-full ${item.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
               )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (tab: string, items: any) => {
    if (!Array.isArray(items)) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No data available for this node</div>;
    
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="px-5 py-4 md:px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 capitalize text-sm md:text-base">{tab} Repository</h2>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-48" />
            </div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] md:text-[10px] font-bold rounded uppercase tracking-tighter">System Read: OK</span>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="text-[10px] md:text-[11px] text-slate-400 uppercase border-b border-slate-100 bg-[#F8FAFC]">
                <th className="px-5 py-4 font-bold tracking-widest">ID</th>
                
                {tab === "users" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">Name</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Email</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Role</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Status</th>
                  </>
                )}

                {tab === "orders" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('tracking')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('destination')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('status')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('payment')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest text-right">{t('cost')}</th>
                  </>
                )}

                {tab === "methods" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('methods')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest">{t('eligibility')}</th>
                    <th className="px-5 py-4 font-bold tracking-widest text-right">{t('cost')}</th>
                  </>
                )}

                {tab === "regions" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">Region Name</th>
                    <th className="px-5 py-4 font-bold tracking-widest">ISO</th>
                  </>
                )}

                {tab === "matrix" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">Route Path</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Method</th>
                    <th className="px-5 py-4 font-bold tracking-widest text-right">Override</th>
                  </>
                )}

                {tab === "providers" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">Provider Label</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Status</th>
                  </>
                )}

                {tab === "eligibility" && (
                  <>
                    <th className="px-5 py-4 font-bold tracking-widest">Provider</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Route</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Method</th>
                    <th className="px-5 py-4 font-bold tracking-widest">Status</th>
                  </>
                )}

                <th className="px-5 py-4 font-bold tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm text-slate-600 font-medium">
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5 font-mono text-[10px] text-slate-400">{item.id.substring(0, 8)}</td>
                  
                  {tab === "users" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-5 py-5 text-slate-500">{item.email}</td>
                      <td className="px-5 py-5 capitalize">{item.role}</td>
                      <td className="px-5 py-5">
                         <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">{item.status}</span>
                      </td>
                    </>
                  )}

                  {tab === "orders" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900">{item.tracking_id}</td>
                      <td className="px-5 py-5 text-slate-500">{item.destination}</td>
                      <td className="px-5 py-5">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                           item.status === 'complete' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                           item.status === 'canceled' ? 'bg-red-50 text-red-600 border-red-100' :
                           'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                           {item.status}
                         </span>
                      </td>
                      <td className="px-5 py-5">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            item.payment_status === 'complete' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {item.payment_status || 'pending'}
                          </span>
                      </td>
                      <td className="px-5 py-5 text-right font-black text-slate-900">${(item.cost || 0).toFixed(2)}</td>
                    </>
                  )}

                  {tab === "methods" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900 flex items-center gap-3">
                        {item.metas?.image && (
                          <img src={item.metas.image} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-100" referrerPolicy="no-referrer" />
                        )}
                        <div>
                          <div className="font-bold">{lang === 'ar' && item.metas?.['ar:title'] ? item.metas['ar:title'] : item.name}</div>
                          {lang === 'ar' && item.metas?.['ar:title'] && <div className="text-[10px] text-slate-400 font-medium">{item.name}</div>}
                        </div>
                      </td>
                      <td className="px-5 py-5">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                           item.shipping_class?.toLowerCase().includes('priority') ? 'bg-orange-100 text-orange-600' :
                           item.shipping_class?.toLowerCase().includes('economy') ? 'bg-green-100 text-green-600' :
                           item.shipping_class?.toLowerCase().includes('overnight') ? 'bg-purple-100 text-purple-600' :
                           'bg-blue-100 text-blue-600'
                         }`}>
                           {item.shipping_class || 'Standard'}
                         </span>
                      </td>
                      <td className="px-5 py-5 text-right text-blue-600 font-black">${(item.base_cost || 0).toFixed(2)}</td>
                    </>
                  )}

                  {tab === "regions" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900">
                        {lang === 'ar' && item.metas?.['ar:title'] ? item.metas['ar:title'] : item.name}
                      </td>
                      <td className="px-5 py-5 tracking-widest">{item.country_code}</td>
                    </>
                  )}

                  {tab === "matrix" && (
                    <>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.from_region_name}</span>
                          <ChevronRight className="h-3 w-3 text-slate-300" />
                          <span className="font-bold text-slate-900">{item.to_region_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-slate-500 font-semibold">{item.method_name}</td>
                      <td className="px-5 py-5 text-right text-blue-600 font-black">
                        {item.base_cost_override ? `$${(item.base_cost_override || 0).toFixed(2)}` : "Default"}
                      </td>
                    </>
                  )}

                  {tab === "providers" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900">
                        {lang === 'ar' && item.metas?.['ar:title'] ? item.metas['ar:title'] : item.name}
                      </td>
                      <td className="px-5 py-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100">
                          {item.status}
                        </span>
                      </td>
                    </>
                  )}

                  {tab === "eligibility" && (
                    <>
                      <td className="px-5 py-5 font-bold text-slate-900">{item.provider_name}</td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{item.from_region}</span>
                          <ChevronRight className="h-3 w-3 text-slate-300" />
                          <span className="font-bold text-slate-700">{item.to_region}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-slate-500 font-semibold">{item.method_name}</td>
                      <td className="px-5 py-5">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            item.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {item.is_active ? 'Eligible' : 'Suspended'}
                          </span>
                      </td>
                    </>
                  )}

                  <td className="px-5 py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="text-blue-600 font-black text-[11px] hover:underline uppercase tracking-tight transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 font-black text-[11px] hover:underline uppercase tracking-tight transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
           <div>
             <h3 className="text-lg font-black text-slate-900 mb-1">System Configuration</h3>
             <p className="text-xs text-slate-500 font-medium tracking-wide mb-6">Manage global logistics rules and API keys.</p>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Dynamic Pricing Engine</p>
                    <p className="text-xs text-slate-500">Enable AI-based route optimization and surging</p>
                  </div>
                  <div className="w-10 h-6 bg-blue-600 rounded-full relative p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                    <p className="text-xs text-slate-500">Temporarily disable quote creation for consumers</p>
                  </div>
                  <div className="w-10 h-6 bg-slate-200 rounded-full relative p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-1 shadow-sm"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Auto-Approve Orders</p>
                    <p className="text-xs text-slate-500">Automatically dispatch orders to providers</p>
                  </div>
                  <div className="w-10 h-6 bg-blue-600 rounded-full relative p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm"></div>
                  </div>
                </div>
             </div>
           </div>
           
           <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
             <button className="px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 text-xs uppercase hover:bg-slate-50">Reset Defaults</button>
             <button className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase shadow-lg shadow-blue-200">Save Changes</button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[#F1F5F9] min-h-screen">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
             <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="h-5 w-5" />
             </div>
             <h2 className="font-bold tracking-tighter text-xl text-slate-900">SHIPADMIN</h2>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Control Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as MainTab)}
                className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all ${activeTab === item.id ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
               <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">AD</div>
               <div>
                 <p className="text-[10px] font-black text-slate-900">Admin Console</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Active Node 01</p>
               </div>
            </div>
            <button onClick={handleLogout} className="w-full py-2.5 bg-white border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="font-black text-slate-900 text-lg tracking-tighter">SHIPADMIN</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
               {mainNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <button 
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as MainTab); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100">
               <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-4 bg-white text-red-600 border border-red-100 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm">
                <LogOut className="h-5 w-5" /> Sign Out
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
            <div className="flex items-center gap-3">
               <span className="text-slate-900 font-black text-xs uppercase tracking-[0.2em]">{t(activeTab as any)}</span>
               {activeTab === "delivery" && (
                 <>
                   <ChevronRight className={`h-3 w-3 text-slate-300 ${isRtl ? 'rotate-180' : ''}`} />
                   <span className="text-blue-600 font-black text-xs uppercase tracking-[0.2em]">{t(deliveryTab as any)}</span>
                 </>
               )}
            </div>
            
            {/* View Toggle */}
            {activeTab !== "analytics" && activeTab !== "settings" && (
              <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode("table")} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "table" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Table</button>
                <button onClick={() => setViewMode("cards")} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === "cards" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Cards</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} 
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              title={lang === 'ar' ? 'English' : 'العربية'}
            >
               <Globe className="h-5 w-5" />
            </button>
             <Link to="/" className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
               <ExternalLink className="h-5 w-5" />
             </Link>
          </div>
        </header>

        <section className="p-4 md:p-8 flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            
            {activeTab === "delivery" && (
              <div className="flex flex-wrap gap-2 mb-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
                {deliveryNavItems.map(subItem => (
                  <button
                    key={subItem.id}
                    onClick={() => setDeliveryTab(subItem.id as DeliverySubTab)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryTab === subItem.id ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
               <div className="flex items-center justify-center h-64">
                 <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Node Database...</p>
                 </div>
               </div>
            ) : (
              <>
                {activeTab === "analytics" && renderAnalytics()}
                {activeTab === "users" && data && (viewMode === "table" ? renderTable("users", data) : renderCards("users", data))}
                {activeTab === "orders" && data && (viewMode === "table" ? renderTable("orders", data) : renderCards("orders", data))}
                {activeTab === "delivery" && data && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" /> <span>{t('add_new')} {t(deliveryTab as any)}</span>
                      </button>
                    </div>
                    {viewMode === "table" ? renderTable(deliveryTab, data) : renderCards(deliveryTab, data)}
                    {deliveryTab === "matrix" && (
                       <button 
                        onClick={() => handleOpenModal()}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all text-xs font-black uppercase tracking-widest"
                       >
                         + Configure New Route Association
                       </button>
                    )}
                  </div>
                )}
                {activeTab === "settings" && renderSettings()}
              </>
            )}

            <div className="flex justify-between items-center px-4 mt-4">
               <Link to="/" className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                 <ArrowLeft className="h-4 w-4" /> Return to Root
               </Link>
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">SECURE_ADMIN_INSTANCE_404</p>
            </div>
          </div>
        </section>
        {renderModal()}
      </main>
    </div>
  );
}
