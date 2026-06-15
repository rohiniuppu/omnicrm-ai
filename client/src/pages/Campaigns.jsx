import React, { useState, useEffect } from 'react';
import { Sparkles, Megaphone, Send, Layers, HelpCircle, RefreshCw, MessageSquarePlus, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [campName, setCampName] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('WhatsApp');
  const [msgTemplate, setMsgTemplate] = useState('');

  // AI assistant states
  const [campaignGoal, setCampaignGoal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // AI Campaign Agent states
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'agent'
  const [agentGoal, setAgentGoal] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentPlan, setAgentPlan] = useState(null); 
  const [agentPreview, setAgentPreview] = useState([]);
  const [agentPreviewLoading, setAgentPreviewLoading] = useState(false);
  const [agentSaving, setAgentSaving] = useState(false);

  // Send campaign tracking states
  const [sendingId, setSendingId] = useState(null);
  const [sendSuccessId, setSendSuccessId] = useState(null);
  const [sendResultText, setSendResultText] = useState('');

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

  const fetchCampaignsAndSegments = async () => {
    try {
      setLoading(true);
      const [campRes, segRes] = await Promise.all([
        fetch(`${API_URL}/api/campaigns`),
        fetch(`${API_URL}/api/segments`)
      ]);

      if (!campRes.ok || !segRes.ok) throw new Error('Failed to fetch campaigns or segments');
      
      const campaignsData = await campRes.json();
      const segmentsData = await segRes.json();

      setCampaigns(campaignsData);
      setSegments(segmentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignsAndSegments();
  }, []);

  const handleAgentPlan = async (e) => {
    e.preventDefault();
    if (!agentGoal.trim()) return;

    setAgentLoading(true);
    setAgentPlan(null);
    setAgentPreview([]);

    try {
      const res = await fetch(`${API_URL}/api/campaigns/ai-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: agentGoal })
      });
      if (!res.ok) throw new Error('AI Campaign Agent failed to plan.');
      const plan = await res.json();
      setAgentPlan(plan);

      // Fetch matches preview list
      setAgentPreviewLoading(true);
      const previewRes = await fetch(`${API_URL}/api/segments/test-filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: plan.filters })
      });
      if (previewRes.ok) {
        const previewData = await previewRes.json();
        setAgentPreview(previewData);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAgentLoading(false);
      setAgentPreviewLoading(false);
    }
  };

  const handleAgentLaunch = async (launchImmediately) => {
    if (!agentPlan) return;

    setAgentSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/agent-launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: agentPlan.campaignName,
          segmentName: agentPlan.segmentName,
          segmentDescription: agentPlan.segmentDescription,
          filters: agentPlan.filters,
          channel: agentPlan.channel,
          messageTemplate: agentPlan.messageTemplate,
            aiExplanation: agentPlan.aiExplanation,
            reasoning: agentPlan.reasoning || [],
          launchImmediately
        })
      });

      if (!res.ok) throw new Error('AI Agent launch failed.');

      const data = await res.json();
      
      // Reset
      setAgentGoal('');
      setAgentPlan(null);
      setAgentPreview([]);
      
      fetchCampaignsAndSegments();

      if (launchImmediately) {
        setSendResultText(`Successfully launched agent campaign to ${data.recipient_count} members.`);
        setSendSuccessId(data.campaign.id);
        setTimeout(() => {
          setSendSuccessId(null);
          setSendResultText('');
        }, 8000);
      } else {
        alert('Campaign and segment saved as draft successfully!');
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setAgentSaving(false);
    }
  };

  const handleAIGenerateCopy = async (e) => {
    e.preventDefault();
    if (!campaignGoal.trim()) return;

    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/ai-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: campaignGoal, channel: selectedChannel })
      });
      if (!res.ok) throw new Error('AI copy generator failed');
      const data = await res.json();
      setMsgTemplate(data.copy);
    } catch (err) {
      alert('AI Copy Generation failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campName.trim() || !msgTemplate.trim()) {
      alert('Campaign Name and Message Template are required.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campName,
          segment_id: selectedSegmentId ? parseInt(selectedSegmentId) : null,
          channel: selectedChannel,
          message_template: msgTemplate
        })
      });

      if (!res.ok) throw new Error('Failed to create campaign');

      // Reset form
      setCampName('');
      setSelectedSegmentId('');
      setMsgTemplate('');
      setCampaignGoal('');
      
      fetchCampaignsAndSegments();
      alert('Campaign created successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendCampaign = async (id, campaignName) => {
    if (!window.confirm(`Launch Campaign "${campaignName}" now? This will queue personalized messages for all segment members.`)) {
      return;
    }

    setSendingId(id);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}/send`, {
        method: 'POST'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to launch campaign');
      }

      const data = await res.json();
      setSendResultText(`Successfully sent to ${data.recipient_count} shoppers. Webhook callbacks will trickle status changes (DELIVERED -> OPENED -> CLICKED) over the next few seconds.`);
      setSendSuccessId(id);

      // Dismiss after 8s
      setTimeout(() => {
        setSendSuccessId(null);
        setSendResultText('');
      }, 8000);

    } catch (err) {
      alert('Launch failed: ' + err.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campaign Operations</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Design outreach templates, utilize AI copy writers, or trigger AI Campaign Agents.</p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/80 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'manual' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Manual Builder
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'agent' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4" /> AI Campaign Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creator Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'agent' ? (
            /* AI Campaign Agent Workflow */
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5.5 w-5.5 text-indigo-400 animate-pulse" />
                  <h3 className="text-lg font-semibold text-white">AI Campaign Assistant (Agent)</h3>
                </div>

                <form onSubmit={handleAgentPlan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Campaign Outreach Goal</label>
                    <textarea
                      required
                      value={agentGoal}
                      onChange={(e) => setAgentGoal(e.target.value)}
                      placeholder="e.g. Pune high spenders have not purchased in 60 days. Offer a 15% discount for a Smart Watch on WhatsApp."
                      rows={3}
                      className="glass-input w-full rounded-xl px-4 py-3 text-xs leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">
                      AI agent selects channel, builds rules, designs segment, and generates templates automatically.
                    </span>
                    <button
                      type="submit"
                      disabled={agentLoading || !agentGoal.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-lg shadow-md disabled:opacity-50 transition-all"
                    >
                      {agentLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Planning Campaign...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Plan Campaign
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {agentPlan && (
                <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5 animate-fade-in">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800/60 pb-2 flex items-center justify-between">
                    <span>Proposed Campaign Plan</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] border border-indigo-500/20">
                      Recommendation Approved
                    </span>
                  </h3>

                  {agentPlan.aiExplanation && (
                    <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300 italic leading-relaxed">
                      💡 <strong>Agent Strategy:</strong> {agentPlan.aiExplanation}
                    </div>
                  )}

                  {Array.isArray(agentPlan.reasoning) && agentPlan.reasoning.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/30 border border-slate-800 text-xs">
                      <span className="block font-semibold text-slate-500 mb-2 uppercase tracking-wider text-[9px]">Reasoning Trail</span>
                      <ul className="space-y-2">
                        {agentPlan.reasoning.map((item) => (
                          <li key={item} className="flex gap-2 text-slate-700 dark:text-slate-300">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-850">
                      <span className="block font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[9px]">Campaign Details</span>
                      <p className="font-bold text-slate-800 dark:text-slate-800 dark:text-slate-200">{agentPlan.campaignName}</p>
                      <p className="text-slate-400 mt-1">Channel: <strong className="text-emerald-400">{agentPlan.channel}</strong></p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-850">
                      <span className="block font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[9px]">Target Segment Details</span>
                      <p className="font-bold text-slate-800 dark:text-slate-800 dark:text-slate-200">{agentPlan.segmentName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{agentPlan.segmentDescription}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-850 text-xs">
                    <span className="block font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[9px]">Message Copy Template</span>
                    <pre className="bg-slate-50 dark:bg-slate-950/40 border border-slate-900 p-3 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                      {agentPlan.messageTemplate}
                    </pre>
                  </div>

                  {/* Preview section */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Audience Reach ({agentPreview.length} matching)
                    </h4>
                    
                    {agentPreviewLoading ? (
                      <div className="h-20 bg-slate-100/80 dark:bg-slate-900/30 animate-pulse rounded-lg flex items-center justify-center text-slate-500 text-xs">
                        Querying Pune segments database...
                      </div>
                    ) : agentPreview.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg">
                        0 customers match this AI rule set. Adjust goal prompt.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {agentPreview.map((cust) => (
                          <div key={cust.id} className="flex justify-between items-center p-2.5 rounded bg-slate-50 dark:bg-slate-900/20 border border-slate-850/60 text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cust.name} ({cust.city || 'No City'})</span>
                            <span className="text-slate-500 font-medium">Spend: ₹{cust.total_spend} | Orders: {cust.order_count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={() => handleAgentLaunch(false)}
                      disabled={agentSaving}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => handleAgentLaunch(true)}
                      disabled={agentSaving || agentPreview.length === 0}
                      className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-300 hover:to-indigo-400 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Approve & Launch Broadcast
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Manual Creator Form Workflow */
            <div className="space-y-6">
              {/* AI Message Copywriter */}
              <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">AI Copywriter Assistant</h3>
                </div>

                <form onSubmit={handleAIGenerateCopy} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Outreach Goal</label>
                    <textarea
                      value={campaignGoal}
                      onChange={(e) => setCampaignGoal(e.target.value)}
                      placeholder="e.g. Generate a friendly WhatsApp message offering 15% discount for Father's Day using code DAD15."
                      rows={2}
                      className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">
                      Targeted copy formatting based on selected channel rules.
                    </span>
                    <button
                      type="submit"
                      disabled={aiLoading || !campaignGoal.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-md disabled:opacity-50 transition-all animate-pulse-slow"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Drafting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Draft Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Form Create */}
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <MessageSquarePlus className="h-5.5 w-5.5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">Build Campaign Broadcast</h3>
                </div>

                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Campaign Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inactive Shoppers Welcome Promo"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="glass-input w-full rounded-lg px-3.5 py-2.5 text-xs focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Target Segment</label>
                      <select
                        value={selectedSegmentId}
                        onChange={(e) => setSelectedSegmentId(e.target.value)}
                        className="glass-input w-full rounded-lg px-3 py-2.5 text-xs font-medium focus:ring-emerald-500/20"
                      >
                        <option value="">All Customers (No Filter)</option>
                        {segments.map((seg) => (
                          <option key={seg.id} value={seg.id}>{seg.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Communication Channel</label>
                      <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="glass-input w-full rounded-lg px-3 py-2.5 text-xs font-medium focus:ring-emerald-500/20"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Email">Email</option>
                        <option value="RCS">RCS</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Message Template</label>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        Use <code className="bg-slate-800 text-slate-700 dark:text-slate-300 px-1 py-0.5 rounded font-bold">[Customer Name]</code> for personalization.
                      </span>
                    </div>
                    <textarea
                      required
                      rows={6}
                      placeholder="e.g. Hi [Customer Name]! It's been a while. Get 20% off using DAD20..."
                      value={msgTemplate}
                      onChange={(e) => setMsgTemplate(e.target.value)}
                      className="glass-input w-full rounded-lg px-3.5 py-2.5 text-xs focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-lg shadow-emerald-950/20 transition-all"
                    >
                      Create Campaign
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* List of active campaigns */}
        <div>
          <div className="glass-panel rounded-2xl p-6 sticky top-24 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800/60">
              <Megaphone className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Active Campaigns</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(n => (
                  <div key={n} className="h-28 bg-slate-100 dark:bg-slate-900/40 border border-slate-800 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No campaigns logged. Configure your first broadcast.
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  (() => {
                    const reasoning = normalizeReasoning(camp.ai_reasoning);
                    return (
                  <div key={camp.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/10 flex flex-col justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{camp.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-750 text-[9px] font-bold text-emerald-400">
                          {camp.channel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-slate-500" /> Target: {camp.segment_name || 'All Customers'}
                      </p>
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-900/60 p-2.5 rounded text-[10px] text-slate-400 line-clamp-2 italic font-mono mt-2">
                        {camp.message_template}
                      </div>
                      {camp.ai_explanation && (
                        <p className="mt-2 text-[10px] leading-5 text-slate-400">
                          {camp.ai_explanation}
                        </p>
                      )}
                      {reasoning.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[10px] text-slate-400">
                          {reasoning.slice(0, 3).map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-1 h-1 w-1 rounded-full bg-cyan-300 shrink-0" />
                              <span className="line-clamp-2">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800/40 pt-3 mt-1">
                      {sendSuccessId === camp.id ? (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] leading-tight font-medium">
                          {sendResultText}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendCampaign(camp.id, camp.name)}
                          disabled={sendingId === camp.id}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                          {sendingId === camp.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" /> Launching...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" /> Launch Campaign
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
