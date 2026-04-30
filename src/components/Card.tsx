import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  title, 
  subtitle, 
  icon, 
  headerAction,
  footer,
  onClick
}) => {
  const isClickable = !!onClick;

  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col transition-all ${isClickable ? 'hover:shadow-md cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      {(title || icon || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-3">
            {icon && <div className="text-blue-600">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>}
              {subtitle && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      
      <div className="flex-1 p-6">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50">
          {footer}
        </div>
      )}
    </div>
  );
};
