import { useState, useEffect } from "react";
import { Package, MapPin, CheckCircle2, ChevronRight, Calculator, Truck, LogIn, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../lib/i18n";

interface Region {
  id: string;
  name: string;
  country_code: string;
  metas?: {
    "ar:title"?: string;
  };
}

interface Class {
  id: string;
  name: string;
  description: string;
}

interface RouteQuote {
  method: { id: string; name: string };
  matrix: { estimated_days: number };
  total: number;
}

interface Address {
  name: string;
  phone: string;
  line: string;
}

interface DestinationItem {
  id: string;
  regionId: string;
  deliveryAddress: Address;
}

export default function OrderFlow() {
  const { t, lang, isRtl } = useTranslation();
  const [step, setStep] = useState(1);
  const [regions, setRegions] = useState<Region[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Form State
  const [pickupAddress, setPickupAddress] = useState<Address>({ name: "", phone: "", line: "" });
  const [recentAddresses, setRecentAddresses] = useState<Address[]>([]);
  const [fromRegionId, setFromRegionId] = useState("");
  const [destinations, setDestinations] = useState<DestinationItem[]>([
    { id: "1", regionId: "", deliveryAddress: { name: "", phone: "", line: "" } }
  ]);
  const [classId, setClassId] = useState("");
  const [weight, setWeight] = useState(1);
  const [size, setSize] = useState(0.1);
  const [isBulk, setIsBulk] = useState(false);

  // Quotes
  const [quotes, setQuotes] = useState<RouteQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  useEffect(() => {
    // Load recent addresses
    const saved = localStorage.getItem("shipcontrol_recent_pickups");
    if (saved) {
      try {
        setRecentAddresses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent addresses", e);
      }
    }

    fetch("/api/regions").then(res => res.json()).then(data => {
      setRegions(data);
      if (data.length >= 2) {
        setFromRegionId(data[0].id);
        setDestinations(prev => [
          { ...prev[0], regionId: data[1].id }
        ]);
      }
    });
    fetch("/api/classes").then(res => res.json()).then(data => {
      setClasses(data);
      if (data.length > 0) {
        setClassId(data[0].id);
      }
    });
  }, []);

  const saveRecentAddress = (addr: Address) => {
    if (!addr.line || !addr.name || !addr.phone) return;
    const isDuplicate = recentAddresses.some(a => a.line === addr.line && a.phone === addr.phone);
    if (isDuplicate) return;
    
    const updated = [addr, ...recentAddresses].slice(0, 5);
    setRecentAddresses(updated);
    localStorage.setItem("shipcontrol_recent_pickups", JSON.stringify(updated));
  };

  const addDestination = () => {
    setDestinations([...destinations, { 
      id: Math.random().toString(36).substr(2, 9), 
      regionId: regions[1]?.id || "", 
      deliveryAddress: { name: "", phone: "", line: "" } 
    }]);
  };

  const removeDestination = (id: string) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter(d => d.id !== id));
    }
  };

  const updateDestination = (id: string, updates: Partial<DestinationItem>) => {
    setDestinations(destinations.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const isFormValid = () => {
    if (!pickupAddress.name || !pickupAddress.phone || !pickupAddress.line || !fromRegionId) return false;
    return destinations.every(d => d.regionId && d.deliveryAddress.name && d.deliveryAddress.phone && d.deliveryAddress.line);
  };

  const handleCalculate = async () => {
    if (!isFormValid()) return;
    setLoadingQuotes(true);
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // Calculate quotes for each destination and sum them up
      const results = await Promise.all(destinations.map(async (dest) => {
        const res = await fetch("/api/calculate-shipping", {
            method: "POST",
            headers,
            body: JSON.stringify({
              fromRegionId,
              toRegionId: dest.regionId,
              classId,
              weight,
              sizeM2: size
            })
        });
        return res.json();
      }));
      
      // Combine results. We assume methods are consistent across calls.
      const baseQuotes: RouteQuote[] = results[0];
      const aggregatedQuotes = baseQuotes.map((bq, idx) => {
          const totalSum = results.reduce((acc, curr) => acc + (curr[idx]?.total || 0), 0);
          // Apply a bulk discount (e.g., 10% off for 3+ destinations)
          const discount = destinations.length >= 3 ? 0.9 : 1.0;
          return {
              ...bq,
              total: totalSum * discount
          };
      });

      setQuotes(aggregatedQuotes);
      setStep(2);
      saveRecentAddress(pickupAddress);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  return (
    <div className={`flex flex-col w-full h-full overflow-auto bg-[#F1F5F9] ${isRtl ? 'font-sans' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-blue-600 mb-1">
             <h2 className="font-bold tracking-tight text-xl text-slate-900">ShipControl</h2>
          </Link>
          <nav className="flex items-center gap-4">
             <Link to="/admin" className="text-sm font-semibold hover:text-blue-600 transition-colors">
              {t('analytics')}
            </Link>
             <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">{t('back_to_home')}</span>
            </Link>
            <div className="w-px h-4 bg-slate-300"></div>
            <Link to="/login" className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <LogIn className="h-4 w-4" />
              <span>{t('enterprise_login')}</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-10 flex-1">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-1">{t('guest_portal')}</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{t('create_shipment')}</h1>
          <p className="text-slate-500">{t('shipment_details_subtitle')}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 px-2 sm:px-0">
          <div className="flex flex-col items-center gap-2 group">
            <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all ${step >= 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>{t('details')}</span>
          </div>
          <div className={`flex-1 h-px bg-slate-200 mx-2 mb-6 ${step >= 2 ? 'bg-blue-400' : ''}`}></div>
          <div className="flex flex-col items-center gap-2 group">
             <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all ${step >= 2 ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>2</div>
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>{t('route')}</span>
          </div>
          <div className={`flex-1 h-px bg-slate-200 mx-2 mb-6 ${step >= 3 ? 'bg-blue-400' : ''}`}></div>
          <div className="flex flex-col items-center gap-2 group">
             <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all ${step >= 3 ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}>3</div>
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>{t('pay')}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-8">
              {/* Pickup Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">{t('pickup_address')}</h3>
                  </div>
                  {recentAddresses.length > 0 && (
                    <select 
                      onChange={(e) => {
                        const addr = recentAddresses[parseInt(e.target.value)];
                        if (addr) setPickupAddress(addr);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none outline-none cursor-pointer p-1 rounded hover:bg-blue-100"
                    >
                      <option value="">{lang === 'ar' ? 'عناوين سابقة' : 'Recent Addresses'}</option>
                      {recentAddresses.map((addr, idx) => (
                        <option key={idx} value={idx}>{addr.line} ({addr.name})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('from_region')}</label>
                     <div className="relative">
                       <MapPin className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3 h-5 w-5 text-slate-400`} />
                       <select 
                         value={fromRegionId} 
                         onChange={e => setFromRegionId(e.target.value)}
                         className={`${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-slate-900 font-medium appearance-none`}
                       >
                         {regions.map(r => <option key={r.id} value={r.id}>{lang === 'ar' && r.metas?.['ar:title'] ? r.metas['ar:title'] : r.name} ({r.country_code})</option>)}
                       </select>
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('full_name')} *</label>
                     <input 
                       className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                       value={pickupAddress.name}
                       onChange={e => setPickupAddress({...pickupAddress, name: e.target.value})}
                       required
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('phone')} *</label>
                     <input 
                       className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                       value={pickupAddress.phone}
                       onChange={e => setPickupAddress({...pickupAddress, phone: e.target.value})}
                       required
                     />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('address_line')} *</label>
                     <input 
                       className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                       value={pickupAddress.line}
                       onChange={e => setPickupAddress({...pickupAddress, line: e.target.value})}
                       required
                     />
                   </div>
                </div>
              </div>

              {/* Destinations Section */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">{t('delivery_address')}</h3>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={isBulk} onChange={e => {
                      setIsBulk(e.target.checked);
                      if (!e.target.checked) setDestinations([destinations[0]]);
                    }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    <span className="font-bold text-xs uppercase tracking-tight text-slate-500">{t('bulk_freight')}</span>
                  </label>
                </div>

                <div className="space-y-10">
                  {destinations.map((dest, idx) => (
                    <div key={dest.id} className="relative bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                      {isBulk && (
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{t('destination_n').replace('{{n}}', (idx + 1).toString())}</span>
                          {destinations.length > 1 && (
                            <button onClick={() => removeDestination(dest.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest">
                                {t('remove_destination')}
                            </button>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('to_region')}</label>
                          <div className="relative">
                            <MapPin className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3 h-5 w-5 text-slate-400`} />
                            <select 
                              value={dest.regionId} 
                              onChange={e => updateDestination(dest.id, { regionId: e.target.value })}
                              className={`${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} w-full border border-slate-300 bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-slate-900 font-medium appearance-none`}
                            >
                              {regions.map(r => <option key={r.id} value={r.id}>{lang === 'ar' && r.metas?.['ar:title'] ? r.metas['ar:title'] : r.name} ({r.country_code})</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('full_name')} *</label>
                          <input 
                            className="w-full border border-slate-300 bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={dest.deliveryAddress.name}
                            onChange={e => updateDestination(dest.id, { deliveryAddress: { ...dest.deliveryAddress, name: e.target.value } })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('phone')} *</label>
                          <input 
                            className="w-full border border-slate-300 bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={dest.deliveryAddress.phone}
                            onChange={e => updateDestination(dest.id, { deliveryAddress: { ...dest.deliveryAddress, phone: e.target.value } })}
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('address_line')} *</label>
                          <input 
                            className="w-full border border-slate-300 bg-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={dest.deliveryAddress.line}
                            onChange={e => updateDestination(dest.id, { deliveryAddress: { ...dest.deliveryAddress, line: e.target.value } })}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isBulk && (
                    <button 
                      onClick={addDestination}
                      className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                      + {t('add_destination')}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-700">{t('package_details')}</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('class')}</label>
                      <div className="relative">
                        <Package className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3 h-5 w-5 text-slate-400`} />
                        <select 
                          value={classId} 
                          onChange={e => setClassId(e.target.value)}
                          className={`${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium appearance-none`}
                        >
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('weight_kg')}</label>
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        value={weight}
                        onChange={e => setWeight(parseFloat(e.target.value))}
                        className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('size_m2')}</label>
                      <input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        value={size}
                        onChange={e => setSize(parseFloat(e.target.value))}
                        className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                      />
                   </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleCalculate}
                  disabled={loadingQuotes || !isFormValid()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                >
                  {loadingQuotes ? t('calculating') : <><Calculator className="h-5 w-5" /> {t('calculate_quotes')}</>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-right">
              <h2 className="text-xl font-bold mb-4 text-slate-900">{t('available_routes')}</h2>
              {quotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">{t('no_routes')}</p>
                  <button onClick={() => setStep(1)} className="mt-4 text-blue-600 font-bold hover:underline">{t('change_details')}</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map((q, i) => (
                    <div key={i} className="border border-slate-200 p-4 rounded-xl flex flex-col md:items-center md:flex-row justify-between hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white group" onClick={() => setStep(3)}>
                      <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg text-slate-900 tracking-tight">{q.method.name}</h3>
                          <p className="text-sm text-slate-500">{t('estimated_delivery')}: {q.matrix.estimated_days} {t('days_unit')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className={isRtl ? 'text-left' : 'text-right'}>
                          <div className="text-2xl font-bold text-blue-600">${q.total.toFixed(2)}</div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('dynamic_route')}</div>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-slate-300 group-hover:text-blue-500 ${isRtl ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setStep(1)} className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-900 mx-auto block transition-colors">
                    {isRtl ? '→' : '←'} {t('back_to_details')}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-10">
              <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-100">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 tracking-tight">{t('ready_checkout')}</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                {t('checkout_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors w-full sm:w-auto">
                  {t('start_over')}
                </button>
                <button disabled className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold opacity-50 cursor-not-allowed w-full sm:w-auto shadow-sm shadow-blue-200">
                  {t('proceed_payment')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
