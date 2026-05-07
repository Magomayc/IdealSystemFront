import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color = "orange", description }) {
  const colors = {
    orange: "bg-orange-100 text-orange-600",
    stone: "bg-stone-100 text-stone-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  const colorClass = colors[color] || colors.orange;

  return (
    <div className="rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm">
      <div className="p-6 flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-slate-500">{title}</h3>
        {Icon && <div className={`p-2 rounded-full ${colorClass}`}><Icon className="h-4 w-4" /></div>}
      </div>
      <div className="p-6 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
    </div>
  );
}