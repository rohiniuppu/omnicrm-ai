import React from 'react';

export default function Card({ title, value, icon: Icon, trend, trendType = 'up', description, loading }) {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/30 text-emerald-600 dark:text-emerald-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg mb-2" />
        ) : (
          <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">{value}</h3>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendType === 'up'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                : trendType === 'down'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                : 'bg-slate-200 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-500/20'
            }`}>
              {trend}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{description}</span>
          )}
        </div>
      </div>
    </div>
  );
}
