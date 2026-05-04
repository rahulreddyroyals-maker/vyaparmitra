// src/components/PremiumBanner.jsx
import { Crown, Zap, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext'
import { useSubscription } from '../hooks/useSubscription'
import { useState } from 'react'

export default function PremiumBanner({ feature, compact = false }) {
  const { lang } = useLang()
  const { isTrial, trialDaysLeft, isPremium } = useSubscription()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (isPremium || dismissed) return null

  if (isTrial && compact) return (
    <div className="bg-alert/10 border border-alert/30 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-amber-700 font-medium">
      <Crown size={14} className="text-alert flex-shrink-0" />
      {lang === 'te'
        ? `ట్రయల్: ${trialDaysLeft} రోజులు మిగిలాయి`
        : `Trial: ${trialDaysLeft} days left`}
      <button
        onClick={() => navigate('/pricing')}
        className="ml-auto bg-alert text-white px-2 py-0.5 rounded-lg font-bold text-xs"
      >
        {lang === 'te' ? 'అప్‌గ్రేడ్' : 'Upgrade'}
      </button>
    </div>
  )

  if (isTrial) return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Crown size={20} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-800">
          {lang === 'te' ? `ట్రయల్: ${trialDaysLeft} రోజులు మిగిలాయి` : `Trial: ${trialDaysLeft} days left`}
        </p>
        <p className="text-xs text-amber-600">
          {lang === 'te' ? 'Premium కొనసాగించడానికి అప్‌గ్రేడ్ చేయండి' : 'Upgrade to keep Premium features'}
        </p>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
      >
        Rs.599
      </button>
    </div>
  )

  // Free plan banner
  return (
    <div className="bg-gradient-to-br from-primary/5 to-purple-50 border border-primary/20 rounded-2xl p-4 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Crown size={18} className="text-yellow-300" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-bold text-navy">
            {lang === 'te' ? 'Premium కు అప్‌గ్రేడ్ చేయండి' : 'Upgrade to Premium'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {feature
              ? (lang === 'te' ? `${feature} కోసం Premium అవసరం` : `${feature} requires Premium`)
              : (lang === 'te' ? 'అపరిమిత బిల్లులు, WhatsApp బాట్ & మరిన్ని' : 'Unlimited invoices, WhatsApp bot & more')
            }
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => navigate('/pricing')}
              className="bg-primary text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Zap size={12} fill="currentColor" />
              {lang === 'te' ? 'Rs.599/నెల' : 'Rs.599/month'}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="text-xs text-primary font-medium"
            >
              {lang === 'te' ? 'ఉచిత ట్రయల్ ప్రయత్నించండి' : 'Try free trial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
