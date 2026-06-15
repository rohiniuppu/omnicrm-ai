import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, LayoutDashboard, MessageSquareText, ShieldCheck, Sparkles, Users, Workflow, BarChart3, DatabaseZap } from 'lucide-react';

const planCards = [
  {
    name: 'Pro',
    price: '$9',
    description: 'AI-assisted CRM for focused growth teams.',
    features: ['Explainable segments', 'AI campaign drafts', 'Webhook tracking'],
    accent: 'from-slate-100 to-slate-300',
    priceHint: '/user/month'
  },
  {
    name: 'Organization',
    price: '$19',
    description: 'Everything in Pro, with team-scale controls.',
    features: ['Role-aware workflows', 'Audit-friendly reasoning', 'Custom channel strategies'],
    accent: 'from-emerald-300 to-cyan-300',
    priceHint: '/user/month'
  }
];

const highlights = [
  { title: 'AI explainability', text: 'Every generated segment and campaign carries a reason trail you can show to the team.', icon: Sparkles },
  { title: 'Segment intelligence', text: 'Turn natural language into customer filters, then preview the matched audience instantly.', icon: Users },
  { title: 'Launch control', text: 'Draft, approve, and send campaigns with a simulated callback pipeline and conversion tracking.', icon: Workflow },
  { title: 'Analytics readiness', text: 'See delivery, open, click, and purchase attribution in one place.', icon: BarChart3 }
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('ops@omnicrm.ai');
  const [password, setPassword] = useState('demo123');

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin?.({ email, password });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050608] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_20%)]" />
      <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.15)]">
              <DatabaseZap className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm tracking-tight text-white">OmniCRM AI</div>
              <div className="text-[10px] text-slate-500">Explainable engagement studio</div>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-300 backdrop-blur">Simple pricing-inspired workspace</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <section className="space-y-8">
            <div className="max-w-2xl space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-300">AI-native CRM for retail teams</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Launch explainable campaigns that feel sharp, not stitched together.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Generate segments from plain language, get a reason trail for every AI decision, and push campaigns through a clean workflow that looks closer to a modern CRM product than a demo dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {highlights.map(({ title, text, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-white/8 bg-white/5 p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {planCards.map((plan) => (
                <article key={plan.name} className="rounded-[2rem] border border-white/10 bg-[#0a0c10]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className={`mb-5 inline-flex rounded-full border border-white/10 bg-gradient-to-r ${plan.accent} bg-clip-text px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-transparent`}>
                    {plan.name}
                  </div>
                  <div className="mb-2 flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-tight text-white">{plan.price}</span>
                    <span className="pb-1 text-sm text-slate-500">{plan.priceHint}</span>
                  </div>
                  <p className="mb-5 text-sm leading-6 text-slate-400">{plan.description}</p>
                  <ul className="space-y-3 text-sm text-slate-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="lg:sticky lg:top-10">
            <div className="rounded-[2rem] border border-white/10 bg-[#0b0d12]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace access</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Sign in to OmniCRM AI</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
                  Demo ready
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                    placeholder="ops@omnicrm.ai"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                    placeholder="Enter your demo password"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-transform hover:translate-y-[-1px]"
                >
                  Enter workspace
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onLogin?.({ email: 'demo@omnicrm.ai', password: 'demo123' })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/8"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Use demo workspace
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <LayoutDashboard className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-sm font-semibold text-white">Dashboard-first workflow</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Monitor campaigns, conversions, and callback events from one surface.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <MessageSquareText className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-sm font-semibold text-white">Reasoning on every AI action</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Segments and campaigns are saved with their rationale, not just the output.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}