import React, { useState } from 'react';
import { Package, Truck, Clock, CheckCircle2, AlertCircle, Filter, Search, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface Order {
  id: string;
  from_region_name: string;
  to_region_name: string;
  total_cost: number;
  status: string;
  created_at: string;
  provider_id?: string;
}

interface OrderListProps {
  orders: Order[];
  canAssign?: boolean;
  canUpdateStatus?: boolean;
  providers?: any[];
  onAssign?: (orderId: string, providerId: string) => void;
  onStatusUpdate?: (orderId: string, status: string) => void;
}

export const OrderList = ({ orders = [], canAssign, canUpdateStatus, providers = [], onAssign, onStatusUpdate }: OrderListProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const handleStatusUpdate = (orderId: string, status: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(orderId, status);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = search.toLowerCase();
    const idMatches = (o.id || '').toLowerCase().includes(searchLower);
    const fromMatches = (o.from_region_name || '').toLowerCase().includes(searchLower);
    const toMatches = (o.to_region_name || '').toLowerCase().includes(searchLower);
    
    return matchesFilter && (idMatches || fromMatches || toMatches);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'assigned': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'processing': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="h-3 w-3" />;
      case 'assigned': return <Truck className="h-3 w-3" />;
      case 'processing': return <Clock className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('search') || 'Search ID or destination...'}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {['all', 'pending', 'assigned', 'processing', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200'
              }`}
            >
              {f === 'all' ? (t('all_orders' as any) || 'ALL') : (t(f as any) || f.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table/List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop Head */}
        <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="col-span-1">ID</div>
          <div className="col-span-2">Route</div>
          <div className="col-span-1">Cost</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredOrders.map((order) => (
            <div key={order.id} className="group hover:bg-slate-50 transition-colors">
              {/* Desktop Row */}
              <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-5 items-center">
                <div className="col-span-1 font-black text-slate-900 text-xs">#{order.id.slice(0, 8)}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">{order.from_region_name}</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className="px-2 py-0.5 bg-blue-50 rounded text-[9px] font-bold text-blue-600">{order.to_region_name}</span>
                  </div>
                </div>
                <div className="col-span-1 text-xs font-black text-slate-700">${(order.total_cost || 0).toFixed(2)}</div>
                <div className="col-span-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border ${getStatusStyle(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {canAssign && (
                    <select 
                      className="text-[10px] font-black p-2 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      value={order.provider_id || ''}
                      onChange={(e) => onAssign?.(order.id, e.target.value)}
                    >
                      <option value="">{t('assign_provider' as any) || 'ASSIGNEE'}</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  {canUpdateStatus && order.status !== 'delivered' && (
                    <select 
                      className="text-[10px] font-black p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg outline-none"
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    >
                      <option value="assigned">Assigned</option>
                      <option value="processing">Processing</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  )}
                  {!canAssign && !canUpdateStatus && (
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Card */}
              <div className="md:hidden p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Index</p>
                    <p className="text-sm font-black text-slate-900 leading-none">#{order.id.slice(0, 8)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border ${getStatusStyle(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transit Node</p>
                    <p className="text-[10px] font-bold text-slate-700">{order.from_region_name} → {order.to_region_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Value</p>
                    <p className="text-xs font-black text-blue-600">${(order.total_cost || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {canAssign && (
                    <select 
                      className="flex-1 text-[10px] font-black p-3 bg-slate-100 rounded-xl outline-none"
                      value={order.provider_id || ''}
                      onChange={(e) => onAssign?.(order.id, e.target.value)}
                    >
                      <option value="">{t('assign_provider' as any) || 'Assign Provider'}</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  {canUpdateStatus && order.status !== 'delivered' && (
                    <select 
                      className="flex-1 text-[10px] font-black p-3 bg-indigo-600 text-white rounded-xl outline-none"
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    >
                      <option value="assigned">Assigned</option>
                      <option value="processing">Processing</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Package className="h-12 w-12 opacity-10 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No matching shipments found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
