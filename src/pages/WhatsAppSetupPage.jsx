// src/pages/WhatsAppSetupPage.jsx
// Shown in the app sidebar under Settings
// Guides you through WhatsApp API activation when ready

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, ExternalLink, Copy, Smartphone, Zap, MessageSquare } from 'lucide-react'
import { isWhatsAppLive, ACTIVATION_STEPS, getWhatsAppStatus } from '../lib/whatsapp'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function WhatsAppSetupPage() {
  const navigate = useNavigate()
  const { business } = useAuth()
  const { lang } = useLang()
  const isLive = isWhatsAppLive()
  const status = getWhatsAppStatus()
  const [copied, setCopied] = useState('')

  const copy = (text, label) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(label)
    toast.success('Copied!')
    setTimeout(() => setCopied(''), 2000)
  }

  const ENV_VARS = [
    { key: 'VITE_WATI_API_URL', value: 'https://live-server-XXXXX.wati.io', desc: 'Your WATI server URL' },
    { key: 'VITE_WATI_API_TOKEN', value: 'eyJhbGciOiJIUzI1NiJ9...', desc: 'Bearer token from WATI' },
  ]

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-navy text-white px-4 pt-4 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-300 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-display font-bold">WhatsApp Integration</h1>
        <p className="text-blue-300 text-sm mt-1">
          {lang === 'te' ? 'WhatsApp API సెటప్' : 'Connect real WhatsApp to your business'}
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Current Status */}
        <div className={`rounded-2xl p-4 border ${
          isLive
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLive ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isLive ? <Zap size={20} className="text-green-600" /> : <Smartphone size={20} className="text-blue-600" />}
            </div>
            <div>
              <p className={`font-bold text-sm ${isLive ? 'text-green-800' : 'text-blue-800'}`}>
                {status.badge} {status.label}
              </p>
              <p className={`text-xs ${isLive ? 'text-green-600' : 'text-blue-600'}`}>
                {status.description}
              </p>
            </div>
          </div>
          {!isLive && (
            <p className="text-xs text-blue-700 bg-blue-100 rounded-xl p-3 mt-2 leading-relaxed">
              The WhatsApp Simulator is fully functional for demos and onboarding.
              When you get a paying client, follow the steps below to activate real WhatsApp.
            </p>
          )}
        </div>

        {/* What works now */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-bold text-navy text-sm mb-3">What works RIGHT NOW (Simulator)</p>
          {[
            'Record sales by typing messages',
            'Track payments and dues',
            'Get business insights',
            'Show clients a live demo',
            'All data saves to Supabase',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <CheckCircle size={14} className="text-success flex-shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>

        {/* What activating adds */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-bold text-navy text-sm mb-3">After adding API key (Live mode adds)</p>
          {[
            'Customers message on real WhatsApp',
            'Bot replies automatically on WhatsApp',
            'Auto payment reminders sent to customers',
            'Low stock alerts sent to your phone',
            'Invoice shares go via real WhatsApp',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <Circle size={14} className="text-gray-300 flex-shrink-0" />
              <span className="text-sm text-gray-500">{item}</span>
            </div>
          ))}
        </div>

        {/* Activation Steps */}
        <div>
          <p className="font-bold text-navy text-sm mb-3">How to activate (when ready)</p>
          <div className="space-y-3">
            {ACTIVATION_STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{s.step}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.free ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {s.cost}
                    </span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1">
                        Open <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Env vars to add */}
        <div className="bg-navy rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-1">Environment Variables to Add</p>
          <p className="text-blue-300 text-xs mb-3">
            Add these to Vercel → Settings → Environment Variables
          </p>
          <div className="space-y-3">
            {ENV_VARS.map((env) => (
              <div key={env.key} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-300 font-mono text-xs font-bold">{env.key}</span>
                  <button
                    onClick={() => copy(env.key, env.key)}
                    className="text-blue-300 hover:text-white"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <span className="text-blue-200 font-mono text-xs break-all">{env.value}</span>
                <p className="text-blue-400 text-xs mt-1">{env.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-blue-400 text-xs mt-3">
            After adding, redeploy — the app auto-detects the API and switches from Simulator to Live mode.
          </p>
        </div>

        {/* Provider comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-bold text-navy text-sm mb-3">WhatsApp API Providers (India)</p>
          {[
            { name: 'WATI', cost: 'Rs.2,000/mo', recommended: true, url: 'wati.io', note: 'Best for India, easy setup' },
            { name: 'Interakt', cost: 'Rs.1,499/mo', recommended: false, url: 'interakt.ai', note: 'Good support' },
            { name: 'Gupshup', cost: 'Pay per msg', recommended: false, url: 'gupshup.io', note: 'Pay per message' },
            { name: 'Twilio', cost: '$15/mo', recommended: false, url: 'twilio.com', note: 'Good for devs, sandbox free' },
          ].map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${p.recommended ? 'bg-success' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-semibold text-navy flex items-center gap-1">
                    {p.name}
                    {p.recommended && <span className="text-xs bg-success text-white px-1.5 py-0.5 rounded-full">Recommended</span>}
                  </p>
                  <p className="text-xs text-gray-400">{p.note}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-navy">{p.cost}</p>
                <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary">{p.url}</a>
              </div>
            </div>
          ))}
        </div>

        {/* Backend webhook note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="font-bold text-amber-800 text-sm mb-2">Backend Webhook (Optional)</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            For customers to message your WhatsApp number and get bot replies, you need the backend webhook running.
            The backend folder in your project has this ready. Deploy it to Railway (free tier) when you have your first paid client.
          </p>
          <div className="mt-2 bg-amber-100 rounded-lg p-2 font-mono text-xs text-amber-800">
            Webhook URL: https://your-backend.railway.app/webhook
          </div>
        </div>

        {/* Quick contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <MessageSquare size={24} className="text-success mx-auto mb-2" />
          <p className="font-bold text-navy text-sm mb-1">Need help setting up?</p>
          <p className="text-xs text-gray-500 mb-3">When you have a paid client ready, contact us and we'll set up the full WhatsApp API in 1 hour</p>
          <a
            href="https://wa.me/919573500321?text=Hi! I have a paid client and want to activate WhatsApp API for VyaparMitra."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-success text-white text-sm font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
          >
            <span>💬</span> WhatsApp Us
          </a>
        </div>

      </div>
    </div>
  )
}
