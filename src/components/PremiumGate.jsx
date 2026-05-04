// src/components/PremiumGate.jsx
import { Crown, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext'
import { useSubscription } from '../hooks/useSubscription'

export default function PremiumGate({ feature, featureTe, children }) {
  const { canUseFeature, isTrial } = useSubscription()
  const { lang } = useLang()
  const navigate = useNavigate()

  if (canUseFeature(feature)) return children

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none opacity-30 blur-sm">
        {children}
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 mx-4 text-center border border-gray-100">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock size={24} className="text-white" />
          </div>
          <h3 className="font-display font-bold text-navy text-base mb-1">
            {lang === 'te' ? 'Premium ఫీచర్' : 'Premium Feature'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {lang === 'te'
              ? `${featureTe || feature} కోసం Premium సభ్యత్వం అవసరం`
              : `${feature} requires a Premium subscription`}
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          >
            <Crown size={16} className="text-yellow-300" />
            {lang === 'te' ? 'Premium కు అప్‌గ్రేడ్ చేయండి' : 'Upgrade to Premium'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {lang === 'te' ? 'Rs.599/నెల • 30 రోజుల ఉచిత ట్రయల్' : 'Rs.599/month • 30-day free trial'}
          </p>
        </div>
      </div>
    </div>
  )
}
