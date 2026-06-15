import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Send, CheckCircle, BookOpen, RefreshCw, BarChart2 } from 'lucide-react';
import Card from '../components/Card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentComms, setRecentComms] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [analyticsRes, commsRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics`),
        fetch(`${API_URL}/api/communications?limit=10`)
      ]);
      if (!analyticsRes.ok || !commsRes.ok) throw new Error('Failed to fetch dashboard data');
      const analyticsData = await analyticsRes.json();
      const commsData = await commsRes.json();
      setData(analyticsData);
      setRecentComms(commsData.slice(0, 8));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => { setIsRefreshing(true); fetchData(); };

  const summary = data?.summary || { total_sent:0, delivered:0, failed:0, opened:0, clicked:0, conversion_rate:0, delivery_rate:0, open_rate:0 };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Marketing Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time simulator activity tracking and shopper engagement dashboard.</p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          Failed to load analytics: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <Card title="Total Sent" value={summary.total_sent} icon={Send} loading={loading} description="Messages pushed to simulated service" />
        <Card title="Delivered" value={`${summary.delivered} (${summary.delivery_rate}%)`} icon={CheckCircle} loading={loading} trend={summary.delivery_rate > 80 ? 'Good' : 'Medium'} trendType={summary.delivery_rate > 80 ? 'up' : 'neutral'} description="Successful gateway completions" />
        <Card title="Opened" value={`${summary.opened} (${summary.open_rate}%)`} icon={BookOpen} loading={loading} description="Messages viewed by simulated shoppers" />
        <Card title="Conversions" value={summary.conversions || 0} icon={CheckCircle} loading={loading} trend={summary.conversions > 0 ? 'Active' : 'Zero'} trendType={summary.conversions > 0 ? 'up' : 'neutral'} description="Attributed orders / purchases completed" />
        <Card title="Conversion Rate" value={`${summary.conversion_rate}%`} icon={BarChart2} loading={loading} trend={summary.conversion_rate > 10 ? 'High' : 'Normal'} trendType={summary.conversion_rate > 10 ? 'up' : 'neutral'} description="Purchase-to-Sent conversion ratio" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Engagement Activity (Past 7 Days)</h3>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-900/40 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-sm">Preparing chart data...</div>
            ) : data?.timeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area name="Sent" type="monotone" dataKey="sent" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                  <Area name="Opened" type="monotone" dataKey="opened" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                  <Area name="Clicks" type="monotone" dataKey="clicked" stroke="#38bdf8" strokeWidth={2} fillOpacity={0} />
                  <Area name="Purchases" type="monotone" dataKey="conversions" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConversions)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">No campaign engagement logged yet. Send a campaign to view metrics!</div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Live Simulator Webhooks</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Shows incoming message callbacks from the Channel Service gateway in real-time.</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {recentComms.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Waiting for active callbacks...</div>
              ) : (
                recentComms.map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 text-xs">
                    <div className="flex flex-col gap-0.5 truncate mr-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{comm.customer_name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{comm.campaign_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">
                        {new Date(comm.updated_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        comm.status === 'CONVERTED' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 animate-pulse' :
                        comm.status === 'CLICKED' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                        comm.status === 'OPENED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        comm.status === 'DELIVERED' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' :
                        comm.status === 'FAILED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                        'bg-slate-200 dark:bg-slate-500/10 text-slate-500 border border-slate-300 dark:border-slate-500/20'
                      }`}>
                        {comm.status === 'CONVERTED' ? 'PURCHASED' : comm.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4 mt-4 text-[10px] text-slate-400 text-center">
            Automatic polling updates every 5 seconds.
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Campaign Performance Matrix</h3>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="h-32 bg-slate-100 dark:bg-slate-900/40 animate-pulse rounded-xl" />
          ) : data?.campaigns?.length > 0 ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Campaign Name</th>
                  <th className="pb-3 px-4">Channel</th>
                  <th className="pb-3 px-4 text-center">Sent</th>
                  <th className="pb-3 px-4 text-center">Delivered</th>
                  <th className="pb-3 px-4 text-center">Opened</th>
                  <th className="pb-3 px-4 text-center">Clicked</th>
                  <th className="pb-3 px-4 text-center">Conversions</th>
                  <th className="pb-3 px-4 text-center">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((camp) => (
                  <tr key={camp.campaign_id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-900/25 transition-colors">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">{camp.campaign_name}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-medium">{camp.channel}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-bold">{camp.sent}</td>
                    <td className="py-3.5 px-4 text-center text-blue-500 font-semibold">{camp.delivered}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-500 font-semibold">{camp.opened}</td>
                    <td className="py-3.5 px-4 text-center text-sky-500 font-semibold">{camp.clicked}</td>
                    <td className="py-3.5 px-4 text-center text-amber-500 font-bold">{camp.conversions || 0}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">{camp.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-slate-400">No campaign data available. Create and launch campaigns to start tracking details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
