import { useState, useEffect } from "react";
import { ArrowRight, Truck, LogIn, Shield, Globe, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../lib/i18n";

export default function Landing() {
  const { t, lang, setLanguage, isRtl } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-slate-950 ${isRtl ? 'font-sans' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background Media - Using a high-quality logistics video loop */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-cargo-ship-sailing-across-the-ocean-41006-large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90"></div>
      </div>

      {/* Navigation Overlay */}
      <header className="absolute top-0 left-0 z-30 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 md:h-24 flex justify-between items-center text-left">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className={`h-8 w-8 md:h-10 md:w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/40 group-hover:scale-105 transition-transform ${isRtl ? 'order-last' : ''}`}>
              <Truck className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className={`flex flex-col ${isRtl ? 'items-end ml-1 md:ml-2' : ''}`}>
              <span className="font-black tracking-tighter text-lg md:text-2xl text-white leading-none">LOGISTICS</span>
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-blue-400">Logistics Engine</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <button 
              onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <Globe className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden xs:inline">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            {isAuthenticated && (
              <Link to="/profile" className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-colors hidden sm:block">
                {t('profile_page') || 'Profile'}
              </Link>
            )}
            <Link to="/admin" className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-colors hidden sm:block">
              {t('analytics')}
            </Link>
            <Link to="/order" className="text-xs font-bold text-white uppercase tracking-widest hover:text-blue-400 transition-colors hidden lg:block">
              {t('get_started')}
            </Link>
            {isAuthenticated ? (
              <Link to="/profile/general" className="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full border border-blue-500 bg-blue-600/20 backdrop-blur-md text-white hover:bg-blue-600/30 transition-all active:scale-95 shadow-xl shrink-0">
                <User className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 shadow-xl shrink-0">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('enterprise_login')}</span>
                <span className="sm:hidden">{lang === 'ar' ? 'دخول' : 'Login'}</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 w-full min-h-screen flex items-center justify-center pt-24 px-6">
        <div className="max-w-4xl w-full text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8 animate-fade-in shadow-2xl">
            <Shield className="h-3 w-3" /> System Version 1.04 Live
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-8 leading-[1.1] md:leading-[0.9]">
            {lang === 'ar' ? 'سرعة الضوء' : 'FAST AS LIGHT'}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              {lang === 'ar' ? 'ذكاء اصطناعي' : 'SMART AS AI'}
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-sm md:text-lg text-slate-300 font-medium leading-relaxed mb-12 opacity-80">
            {t('hero_subtitle')}. 
            {lang === 'ar' 
              ? 'قم بأتمتة توزيعك العالمي باستخدام مصفوفة المسارات المتعددة لدينا. تعيين المزودين في الوقت الفعلي لكل شحنة وكل إحداثي.'
              : 'Automate your global distribution with our multi-strategy route matrix. Real-time provider assignment for every shipment, every coordinate.'}
          </p>

          <div className="flex items-center justify-center w-full">
            <Link 
              to="/order" 
              className={`group w-full sm:w-auto px-10 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 active:scale-[0.98] flex items-center justify-center gap-3`}
            >
              {lang === 'ar' ? 'إنشاء شحنة' : 'CREATE SHIPMENT'} <ArrowRight className={`h-5 w-5 group-hover:translate-x-1 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 flex-wrap">
            <div className={`text-[11px] font-black tracking-widest text-white border-white/20 px-8 ${isRtl ? 'border-l' : 'border-r'}`}>TRUSTED BY 2000+ COURIERS</div>
            <div className="flex gap-4">
              <span className="font-bold text-white italic">GLOBALSAT</span>
              <span className="font-bold text-white italic">AEROPORT</span>
              <span className="font-bold text-white italic">NEO-TRANS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Bottom Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-50 z-20"></div>
    </div>
  );
}
