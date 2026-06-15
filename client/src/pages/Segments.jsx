import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, Users, Save, Search, AlertCircle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual rule builder fields
  const [segmentName, setSegmentName] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    total_spend: { operator: '>', value: '' },
    city: { operator: '=', value: '' },
    order_count: { operator: '>=', value: '' },
    last_purchase_date: { operator: '<', value: '' } // days ago
  });

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiReasoning, setAiReasoning] = useState([]);

  // Preview State
  const [previewCustomers, setPreviewCustomers] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRun, setPreviewRun] = useState(false);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/segments`);
      if (!res.ok) throw new Error('Failed to fetch segments');
      const data = await res.json();
      setSegments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const normalizeReasoning = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleFilterChange = (field, key, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  };

  // Compile active filters removing blank entries
  const compileFilters = () => {
    const compiled = {};
    for (const [field, filter] of Object.entries(activeFilters)) {
      if (filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== '') {
        // Parse numbers
        const numericVal = Number(filter.value);
        compiled[field] = {
          operator: filter.operator,
          value: isNaN(numericVal) || field === 'city' ? filter.value : numericVal
        };
      }
    }
    return compiled;
  };

  // Run preview check
  const handlePreview = async () => {
    const filters = compileFilters();
    if (Object.keys(filters).length === 0) {
      alert('Please configure at least one filter rule or use the AI Generator.');
      return;
    }

    setPreviewLoading(true);
    setPreviewRun(true);
    try {
      const res = await fetch(`${API_URL}/api/segments/test-filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      if (!res.ok) throw new Error('Failed to fetch preview');
      const data = await res.json();
      setPreviewCustomers(data);
    } catch (err) {
      alert('Preview failed: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // AI segment generation
  const handleAIGenerate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/segments/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiPrompt })
      });
      if (!res.ok) throw new Error('AI Engine failed');
      const data = await res.json();

      setAiExplanation(data.explanation);
      setAiReasoning(Array.isArray(data.reasoning) ? data.reasoning : []);

      // Populate manual builder filters with parsed AI results
      const newFilters = {
        total_spend: { operator: '>', value: '' },
        city: { operator: '=', value: '' },
        order_count: { operator: '>=', value: '' },
        last_purchase_date: { operator: '<', value: '' }
      };

      if (data.filters) {
        for (const [field, filter] of Object.entries(data.filters)) {
          if (newFilters[field]) {
            newFilters[field] = {
              operator: filter.operator || (field === 'city' ? '=' : '>'),
              value: filter.value ?? ''
            };
          }
        }
      }

      setActiveFilters(newFilters);
      
      // Auto run preview for parsed filters
      setTimeout(() => {
        handlePreview();
      }, 100);

    } catch (err) {
      alert('AI Generation failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveSegment = async (e) => {
    e.preventDefault();
    const filters = compileFilters();
    if (!segmentName.trim()) {
      alert('Segment name is required.');
      return;
    }
    if (Object.keys(filters).length === 0) {
      alert('Segment cannot be empty. Configure rules first.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName,
          description: segmentDesc || aiExplanation || 'Custom filter segmentation.',
          filters,
          ai_explanation: aiExplanation,
          ai_reasoning: aiReasoning
        })
      });

      if (!res.ok) throw new Error('Failed to save segment');
      
      // Reset builder inputs
      setSegmentName('');
      setSegmentDesc('');
      setAiExplanation('');
      setAiReasoning([]);
      setPreviewRun(false);
      setPreviewCustomers([]);
      setActiveFilters({
        total_spend: { operator: '>', value: '' },
        city: { operator: '=', value: '' },
        order_count: { operator: '>=', value: '' },
        last_purchase_date: { operator: '<', value: '' }
      });
      
      fetchSegments();
      alert('Segment saved successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!window.confirm('Delete this segment? Associated campaigns will remain but default to All Customers.')) return;
    try {
      const res = await fetch(`${API_URL}/api/segments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete segment');
      fetchSegments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Audience Segmentation</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Isolate marketing segments using parameters or natural language AI translation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creator panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI segment generator */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden">
            {/* Ambient indicator glow */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">AI-Native Segment Generator</h3>
            </div>
            
            <form onSubmit={handleAIGenerate} className="space-y-4">
              <div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Show customers in Mumbai who spent over 5000 rupees and haven't purchased in the last 30 days"
                  rows={2}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">
                  Powered by Gemini LLM filter translation engine.
                </span>
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-lg shadow-md disabled:opacity-50 transition-all"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Parse Query
                    </>
                  )}
                </button>
              </div>
            </form>

            {aiExplanation && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-950/20 border border-indigo-850 text-xs leading-relaxed">
                <div className="font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> AI Segment Recommendation
                </div>
                <p className="text-slate-700 dark:text-slate-300">{aiExplanation}</p>
                {aiReasoning.length > 0 && (
                  <ul className="mt-3 space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                    {aiReasoning.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Rule configurations */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Configure Segment Rules</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Spend */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Spend (INR)</label>
                <div className="flex gap-2">
                  <select
                    value={activeFilters.total_spend.operator}
                    onChange={(e) => handleFilterChange('total_spend', 'operator', e.target.value)}
                    className="glass-input rounded-lg px-2 py-1.5 text-xs font-medium w-16"
                  >
                    <option value="&gt;">&gt;</option>
                    <option value="&gt;=">&gt;=</option>
                    <option value="&lt;">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    type="number"
                    value={activeFilters.total_spend.value}
                    onChange={(e) => handleFilterChange('total_spend', 'value', e.target.value)}
                    placeholder="Min Spend"
                    className="glass-input rounded-lg px-3 py-1.5 text-xs flex-grow"
                  />
                </div>
              </div>

              {/* City */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resident City</label>
                <div className="flex gap-2">
                  <select
                    value={activeFilters.city.operator}
                    onChange={(e) => handleFilterChange('city', 'operator', e.target.value)}
                    className="glass-input rounded-lg px-2 py-1.5 text-xs font-medium w-16"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                  </select>
                  <input
                    type="text"
                    value={activeFilters.city.value}
                    onChange={(e) => handleFilterChange('city', 'value', e.target.value)}
                    placeholder="City Name"
                    className="glass-input rounded-lg px-3 py-1.5 text-xs flex-grow"
                  />
                </div>
              </div>

              {/* Order Count */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Purchase Count (Orders)</label>
                <div className="flex gap-2">
                  <select
                    value={activeFilters.order_count.operator}
                    onChange={(e) => handleFilterChange('order_count', 'operator', e.target.value)}
                    className="glass-input rounded-lg px-2 py-1.5 text-xs font-medium w-16"
                  >
                    <option value="&gt;=">&gt;=</option>
                    <option value="&gt;">&gt;</option>
                    <option value="&lt;">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input
                    type="number"
                    value={activeFilters.order_count.value}
                    onChange={(e) => handleFilterChange('order_count', 'value', e.target.value)}
                    placeholder="Min Orders"
                    className="glass-input rounded-lg px-3 py-1.5 text-xs flex-grow"
                  />
                </div>
              </div>

              {/* Inactivity period */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inactivity Period (Days ago)</label>
                <div className="flex gap-2">
                  <select
                    value={activeFilters.last_purchase_date.operator}
                    onChange={(e) => handleFilterChange('last_purchase_date', 'operator', e.target.value)}
                    className="glass-input rounded-lg px-2 py-1.5 text-xs font-medium w-16"
                  >
                    <option value="&lt;">older than</option>
                    <option value="&gt;=">within</option>
                  </select>
                  <input
                    type="number"
                    value={activeFilters.last_purchase_date.value}
                    onChange={(e) => handleFilterChange('last_purchase_date', 'value', e.target.value)}
                    placeholder="Days ago"
                    className="glass-input rounded-lg px-3 py-1.5 text-xs flex-grow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/60">
              <button
                onClick={handlePreview}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-800 hover:text-white rounded-lg transition-colors"
              >
                Preview Audience
              </button>
            </div>
          </div>

          {/* Preview list results */}
          {previewRun && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Audience Preview ({previewCustomers.length} matching)</h3>
                </div>
              </div>

              {previewLoading ? (
                <div className="h-24 bg-slate-100 dark:bg-slate-900/40 animate-pulse rounded-xl flex items-center justify-center text-slate-500 text-xs">
                  Running filter queries...
                </div>
              ) : previewCustomers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  0 customers matching the rules selected. Adjust filters.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {previewCustomers.map((cust) => (
                    <div key={cust.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-100/80 dark:bg-slate-900/30 border border-slate-850 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-800 dark:text-slate-200">{cust.name}</span>
                        <span className="text-[10px] text-slate-500 block">{cust.email} | {cust.city || 'No City'}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-400 block">₹{parseFloat(cust.total_spend || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 block">{cust.order_count} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Segment Panel */}
              {!previewLoading && previewCustomers.length > 0 && (
                <form onSubmit={handleSaveSegment} className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Save Audience Segment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP Inactive shoppers"
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      className="glass-input rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="e.g. Target premium customers with WhatsApp coupons"
                      value={segmentDesc}
                      onChange={(e) => setSegmentDesc(e.target.value)}
                      className="glass-input rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-md transition-all"
                    >
                      <Save className="h-3.5 w-3.5" /> Save Segment
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* List of saved segments */}
        <div>
          <div className="glass-panel rounded-2xl p-6 sticky top-24 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800/60">
              <Layers className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Saved Segments</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(n => (
                  <div key={n} className="h-20 bg-slate-100 dark:bg-slate-900/40 border border-slate-800 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : segments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No saved segments. Create one using the rule builder!
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((seg) => {
                  let filterCount = 0;
                  try {
                    filterCount = Object.keys(JSON.parse(seg.filters)).length;
                  } catch (e) {}
                  const reasoning = normalizeReasoning(seg.ai_reasoning);

                  return (
                    <div key={seg.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/20 hover:border-slate-700/60 flex justify-between items-start gap-3 text-xs transition-all">
                      <div className="space-y-1 truncate mr-2">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{seg.name}</h4>
                        {seg.description && (
                          <p className="text-[10px] text-slate-500 truncate">{seg.description}</p>
                        )}
                        {seg.ai_explanation && (
                          <p className="text-[10px] leading-5 text-slate-400">
                            {seg.ai_explanation}
                          </p>
                        )}
                        {reasoning.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {reasoning.slice(0, 3).map((item) => (
                              <div key={item} className="flex gap-2 text-[10px] text-slate-400">
                                <span className="mt-1 h-1 w-1 rounded-full bg-emerald-300" />
                                <span className="line-clamp-2">{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-750 text-slate-400">
                          {filterCount} Active Filter Rules
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all shrink-0"
                        title="Delete Segment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
