// src/pages/PricingPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Check, Crown, Zap, Star, ArrowLeft, Gift, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addDays, differenceInDays } from 'date-fns'

const FEATURES_FREE = [
  { en: 'Up to 10 invoices/month', te: 'నెలకు 10 బిల్లులు' },
  { en: 'Up to 5 products', te: '5 ఉత్పత్తులు' },
  { en: 'Up to 3 customers', te: '3 కస్టమర్లు' },
  { en: 'Basic dashboard', te: 'బేసిక్ డాష్‌బోర్డ్' },
  { en: 'WhatsApp Simulator', te: 'WhatsApp సిమ్యులేటర్' },
]

const FEATURES_PREMIUM = [
  { en: 'Unlimited invoices', te: 'అపరిమిత బిల్లులు', highlight: true },
  { en: 'Unlimited products & customers', te: 'అపరిమిత ఉత్పత్తులు & కస్టమర్లు', highlight: true },
  { en: 'WhatsApp Business API', te: 'WhatsApp బిజినెస్ API', highlight: true },
  { en: 'Auto payment reminders', te: 'స్వయంచాలక రిమైండర్లు', highlight: true },
  { en: 'GST reports & CA export', te: 'GST నివేదికలు & CA ఎగుమతి', highlight: true },
  { en: 'Low stock auto alerts', te: 'స్వయంచాలక స్టాక్ హెచ్చరికలు' },
  { en: 'Advanced analytics', te: 'అడ్వాన్స్డ్ అనాలిటిక్స్' },
  { en: 'Multi-language (Telugu + English)', te: 'తెలుగు + ఇంగ్లీష్' },
  { en: 'Priority support', te: 'ప్రాధాన్య మద్దతు' },
  { en: 'Data export (CSV/PDF)', te: 'డేటా ఎగుమతి (CSV/PDF)' },
]

export default function PricingPage() {
  const { business, user } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [billing, setBilling] = useState('monthly')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)

  const MONTHLY = 599
  const YEARLY = 6000
  const YEARLY_MONTHLY = Math.round(YEARLY / 12)
  const SAVINGS = (MONTHLY * 12) - YEARLY
  const SAVINGS_PCT = Math.round((SAVINGS / (MONTHLY * 12)) * 100)

  useEffect(() => {
    loadSubscription()
  }, [business])

  const loadSubscription = async () => {
    if (!business) return
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle()
    setSubscription(data)
    setLoading(false)
  }

  const startTrial = async () => {
    if (!business?.id || !user?.uid) {
      toast.error('Business or user not found. Please refresh.')
      return
    }
    setActivating(true)
    const trialEnd = addDays(new Date(), 30).toISOString()
    
    // First try insert, then update if exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', business.id)
      .maybeSingle()

    let error
    if (existing) {
      // Update existing
      const res = await supabase
        .from('subscriptions')
        .update({ plan: 'trial', status: 'trial', trial_end: trialEnd, updated_at: new Date().toISOString() })
        .eq('business_id', business.id)
      error = res.error
    } else {
      // Fresh insert
      const res = await supabase
        .from('subscriptions')
        .insert({
          business_id: business.id,
          user_id: user.uid,
          plan: 'trial',
          status: 'trial',
          trial_end: trialEnd,
        })
      error = res.error
    }

    setActivating(false)
    if (error) {
      console.error('Trial error:', error)
      toast.error(`Failed: ${error.message}`)
      return
    }
    toast.success(lang === 'te' ? '30 రోజుల ట్రయల్ ప్రారంభమైంది! ✅' : '30-day trial started! ✅')
    loadSubscription()
  }

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  const confirmPayment = () => {
    // Copy UPI ID to clipboard
    navigator.clipboard?.writeText('vyaparmitra@upi').catch(() => {})
    toast.success(lang === 'te' ? 'UPI ID కాపీ అయింది!' : 'UPI ID copied!')
  }

  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, differenceInDays(new Date(subscription.trial_end), new Date()))
    : 0

  const isPremium = subscription?.status === 'active'
  const isTrial = subscription?.status === 'trial' && trialDaysLeft > 0
  const isExpired = subscription?.status === 'trial' && trialDaysLeft <= 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a1a2e] via-navy to-[#16213e] px-4 pt-4 pb-8 text-white">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-300 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-1">
            {lang === 'te' ? 'VyaparMitra Premium' : 'VyaparMitra Premium'}
          </h1>
          <p className="text-blue-300 text-sm">
            {lang === 'te' ? 'మీ వ్యాపారాన్ని తదుపరి స్థాయికి తీసుకెళ్ళండి' : 'Take your business to the next level'}
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="mt-4 mx-auto max-w-xs">
          {isPremium && (
            <div className="bg-success/20 border border-success/40 rounded-2xl p-3 text-center">
              <p className="text-green-300 font-bold flex items-center justify-center gap-2">
                <Crown size={16} /> {lang === 'te' ? 'Premium సభ్యుడు' : 'Premium Member'}
              </p>
              <p className="text-green-400 text-xs mt-1">
                {subscription?.expires_at
                  ? `Expires: ${format(new Date(subscription.expires_at), 'dd MMM yyyy')}`
                  : 'Active'}
              </p>
            </div>
          )}
          {isTrial && (
            <div className="bg-alert/20 border border-alert/40 rounded-2xl p-3 text-center">
              <p className="text-yellow-300 font-bold flex items-center justify-center gap-2">
                <Clock size={16} /> {lang === 'te' ? 'ట్రయల్ యాక్టివ్' : 'Trial Active'}
              </p>
              <p className="text-yellow-400 text-xs mt-1">
                {lang === 'te' ? `${trialDaysLeft} రోజులు మిగిలాయి` : `${trialDaysLeft} days remaining`}
              </p>
            </div>
          )}
          {isExpired && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-3 text-center">
              <p className="text-red-300 font-bold">
                {lang === 'te' ? 'ట్రయల్ ముగిసింది' : 'Trial Expired'}
              </p>
              <p className="text-red-400 text-xs mt-1">
                {lang === 'te' ? 'Premium కొనుగోలు చేయండి' : 'Upgrade to continue'}
              </p>
            </div>
          )}
          {!subscription && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-white font-bold flex items-center justify-center gap-2">
                <Gift size={16} className="text-yellow-400" />
                {lang === 'te' ? 'ఉచిత ప్లాన్' : 'Free Plan'}
              </p>
              <p className="text-blue-300 text-xs mt-1">
                {lang === 'te' ? '30 రోజుల ఉచిత ట్రయల్ అందుబాటులో ఉంది!' : '30-day free trial available!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Free Trial CTA */}
      {!subscription && (
        <div className="mx-4 -mt-4 mb-4">
          <button
            onClick={startTrial}
            disabled={activating}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 text-lg active:scale-98 transition-transform"
          >
            <Gift size={22} />
            {activating
              ? (lang === 'te' ? 'ప్రారంభమవుతోంది...' : 'Starting...')
              : (lang === 'te' ? '30 రోజుల ఉచిత ట్రయల్ ప్రారంభించండి' : 'Start 30-Day Free Trial')}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            {lang === 'te' ? 'క్రెడిట్ కార్డు అవసరం లేదు. ఏ సమయంలోనైనా రద్దు చేయవచ్చు.' : 'No credit card required. Cancel anytime.'}
          </p>
        </div>
      )}

      {/* Billing Toggle */}
      {!isPremium && (
        <div className="mx-4 mb-4">
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setBilling('monthly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                billing === 'monthly' ? 'bg-white shadow text-navy' : 'text-gray-500'
              }`}
            >
              {lang === 'te' ? 'నెలవారీ' : 'Monthly'}
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                billing === 'yearly' ? 'bg-white shadow text-navy' : 'text-gray-500'
              }`}
            >
              {lang === 'te' ? 'వార్షిక' : 'Yearly'}
              <span className="absolute -top-2 -right-1 bg-success text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                -{SAVINGS_PCT}%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      {!isPremium && (
        <div className="mx-4 space-y-3 mb-6">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-bold text-navy">
                  {lang === 'te' ? 'ఉచిత' : 'Free'}
                </h2>
                <p className="text-xs text-gray-400">
                  {lang === 'te' ? 'చిన్న వ్యాపారాలకు' : 'For small businesses'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-display font-bold text-navy">Rs.0</p>
                <p className="text-xs text-gray-400">{lang === 'te' ? 'ఎప్పటికీ ఉచితం' : 'forever free'}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {FEATURES_FREE.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={15} className="text-gray-400 flex-shrink-0" />
                  {lang === 'te' ? f.te : f.en}
                </div>
              ))}
            </div>
            <div className="bg-gray-100 rounded-xl py-3 text-center text-sm font-semibold text-gray-500">
              {lang === 'te' ? 'ప్రస్తుత ప్లాన్' : 'Current Plan'}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-primary to-[#1d4ed8] rounded-3xl border-2 border-primary p-5 shadow-xl shadow-primary/30 relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-yellow-400 text-navy text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Star size={10} fill="currentColor" /> {lang === 'te' ? 'బెస్ట్ వాల్యూ' : 'Best Value'}
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Crown size={18} className="text-yellow-400" />
                Premium
              </h2>
              <p className="text-blue-200 text-xs">
                {lang === 'te' ? 'అన్ని ఫీచర్లు అన్‌లాక్' : 'All features unlocked'}
              </p>
            </div>

            {billing === 'monthly' ? (
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-white">Rs.{MONTHLY}</span>
                  <span className="text-blue-200 text-sm">/{lang === 'te' ? 'నెల' : 'month'}</span>
                </div>
                <p className="text-blue-200 text-xs mt-0.5">
                  {lang === 'te' ? 'నెలవారీ బిల్లింగ్' : 'Billed monthly'}
                </p>
              </div>
            ) : (
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-white">Rs.{YEARLY}</span>
                  <span className="text-blue-200 text-sm">/{lang === 'te' ? 'సంవత్సరం' : 'year'}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-blue-200 text-xs line-through">Rs.{MONTHLY * 12}/yr</span>
                  <span className="bg-success text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    Rs.{SAVINGS} {lang === 'te' ? 'ఆదా' : 'saved'}!
                  </span>
                </div>
                <p className="text-blue-200 text-xs mt-0.5">
                  = Rs.{YEARLY_MONTHLY}/{lang === 'te' ? 'నెల' : 'month'} {lang === 'te' ? 'మాత్రమే' : 'only'}
                </p>
              </div>
            )}

            <div className="space-y-2 my-4">
              {FEATURES_PREMIUM.map((f, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${f.highlight ? 'text-white font-medium' : 'text-blue-200'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${f.highlight ? 'bg-white/20' : ''}`}>
                    <Check size={12} className={f.highlight ? 'text-yellow-400' : 'text-blue-300'} />
                  </div>
                  {lang === 'te' ? f.te : f.en}
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(billing)}
              className="w-full bg-white text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-lg"
            >
              <Zap size={18} className="text-yellow-500" fill="currentColor" />
              {lang === 'te'
                ? `Premium కు అప్‌గ్రేడ్ చేయండి`
                : `Upgrade to Premium`}
            </button>

            {isTrial && (
              <p className="text-center text-blue-200 text-xs mt-2">
                {lang === 'te'
                  ? `ట్రయల్ ముగిసే ముందు అప్‌గ్రేడ్ చేయండి (${trialDaysLeft} రోజులు మిగిలాయి)`
                  : `Upgrade before trial ends (${trialDaysLeft} days left)`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Already Premium Message */}
      {isPremium && (
        <div className="mx-4 mb-6">
          <div className="bg-gradient-to-br from-success/10 to-green-50 border border-success/30 rounded-3xl p-6 text-center">
            <Crown size={48} className="text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-display font-bold text-navy mb-1">
              {lang === 'te' ? 'మీరు Premium సభ్యులు!' : "You're a Premium Member!"}
            </h2>
            <p className="text-gray-500 text-sm">
              {lang === 'te' ? 'అన్ని ఫీచర్లు అన్‌లాక్ అయ్యాయి' : 'All features are unlocked'}
            </p>
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="mx-4 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-navy">
            {lang === 'te' ? 'ప్లాన్ పోలిక' : 'Plan Comparison'}
          </h3>
        </div>
        {[
          { feature: { en: 'Invoices/month', te: 'నెలకు బిల్లులు' }, free: '10', premium: lang === 'te' ? 'అపరిమిత' : 'Unlimited' },
          { feature: { en: 'Products', te: 'ఉత్పత్తులు' }, free: '5', premium: lang === 'te' ? 'అపరిమిత' : 'Unlimited' },
          { feature: { en: 'Customers', te: 'కస్టమర్లు' }, free: '3', premium: lang === 'te' ? 'అపరిమిత' : 'Unlimited' },
          { feature: { en: 'WhatsApp Bot', te: 'WhatsApp బాట్' }, free: lang === 'te' ? 'లేదు' : 'No', premium: lang === 'te' ? 'అవును' : 'Yes', premiumGreen: true },
          { feature: { en: 'GST Reports', te: 'GST నివేదికలు' }, free: lang === 'te' ? 'లేదు' : 'No', premium: lang === 'te' ? 'అవును' : 'Yes', premiumGreen: true },
          { feature: { en: 'Auto Reminders', te: 'స్వయంచాలక రిమైండర్లు' }, free: lang === 'te' ? 'లేదు' : 'No', premium: lang === 'te' ? 'అవును' : 'Yes', premiumGreen: true },
          { feature: { en: 'Priority Support', te: 'ప్రాధాన్య మద్దతు' }, free: lang === 'te' ? 'లేదు' : 'No', premium: lang === 'te' ? 'అవును' : 'Yes', premiumGreen: true },
        ].map((row, i) => (
          <div key={i} className="flex items-center border-b border-gray-50 last:border-0">
            <div className="flex-1 px-4 py-3 text-sm text-gray-700">
              {lang === 'te' ? row.feature.te : row.feature.en}
            </div>
            <div className="w-20 text-center px-2 py-3 text-sm text-gray-400">{row.free}</div>
            <div className={`w-24 text-center px-2 py-3 text-sm font-semibold ${row.premiumGreen ? 'text-success' : 'text-primary'}`}>
              {row.premium}
            </div>
          </div>
        ))}
        <div className="flex items-center bg-gray-50 border-t border-gray-100">
          <div className="flex-1 px-4 py-2"></div>
          <div className="w-20 text-center px-2 py-2 text-xs text-gray-400 font-medium">
            {lang === 'te' ? 'ఉచిత' : 'Free'}
          </div>
          <div className="w-24 text-center px-2 py-2 text-xs text-primary font-bold">Premium</div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-4 space-y-3">
        <h3 className="font-display font-bold text-navy">
          {lang === 'te' ? 'తరచుగా అడిగే ప్రశ్నలు' : 'Frequently Asked Questions'}
        </h3>
        {[
          {
            q: { en: 'What happens after the free trial?', te: 'ఉచిత ట్రయల్ తర్వాత ఏమవుతుంది?' },
            a: { en: 'After 30 days, your account moves to the Free plan with limited features. No charges without your consent.', te: '30 రోజుల తర్వాత, మీ ఖాతా పరిమిత ఫీచర్లతో ఉచిత ప్లాన్‌కు మారుతుంది. మీ అనుమతి లేకుండా ఎటువంటి చార్జీలు లేవు.' }
          },
          {
            q: { en: 'How do I pay?', te: 'నేను ఎలా చెల్లించాలి?' },
            a: { en: 'UPI, bank transfer, or cash. WhatsApp us after payment to activate instantly.', te: 'UPI, బ్యాంక్ ట్రాన్స్ఫర్, లేదా నగదు. చెల్లింపు తర్వాత WhatsApp చేయండి, వెంటనే యాక్టివేట్ అవుతుంది.' }
          },
          {
            q: { en: 'Can I cancel anytime?', te: 'నేను ఎప్పుడైనా రద్దు చేయవచ్చా?' },
            a: { en: 'Yes! No questions asked. Your data is always safe.', te: 'అవును! ఏ ప్రశ్నలు అడగకుండా. మీ డేటా ఎల్లప్పుడూ సురక్షితం.' }
          },
        ].map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-navy mb-1">
              {lang === 'te' ? faq.q.te : faq.q.en}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              {lang === 'te' ? faq.a.te : faq.a.en}
            </p>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl p-6 pb-8">
            {/* Handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h2 className="text-xl font-display font-bold text-navy text-center mb-1">
              {lang === 'te' ? 'చెల్లింపు వివరాలు' : 'Payment Details'}
            </h2>
            <p className="text-sm text-gray-500 text-center mb-5">
              {lang === 'te'
                ? `${selectedPlan === 'yearly' ? 'వార్షిక' : 'నెలవారీ'} ప్లాన్`
                : `${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`}
            </p>

            {/* Amount */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center mb-4">
              <p className="text-4xl font-display font-bold text-primary">
                Rs.{selectedPlan === 'yearly' ? YEARLY : MONTHLY}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedPlan === 'yearly'
                  ? (lang === 'te' ? `= Rs.${YEARLY_MONTHLY}/నెల (Rs.${SAVINGS} ఆదా!)` : `= Rs.${YEARLY_MONTHLY}/month (Rs.${SAVINGS} saved!)`)
                  : (lang === 'te' ? 'నెలవారీ చెల్లింపు' : 'Monthly billing')}
              </p>
            </div>

            {/* UPI Payment */}
            <div className="space-y-3 mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {lang === 'te' ? 'UPI ద్వారా చెల్లించండి' : 'Pay via UPI'}
              </p>

              {/* UPI ID Box */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">UPI ID</p>
                  <p className="font-bold text-navy text-lg">vyaparmitra@upi</p>
                </div>
                <button
                  onClick={confirmPayment}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                  {lang === 'te' ? 'కాపీ' : 'Copy'}
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {[
                  { step: '1', text: lang === 'te' ? 'GPay / PhonePe / Paytm తెరవండి' : 'Open GPay / PhonePe / Paytm' },
                  { step: '2', text: lang === 'te' ? `UPI ID కి Rs.${selectedPlan === 'yearly' ? YEARLY : MONTHLY} పంపండి` : `Send Rs.${selectedPlan === 'yearly' ? YEARLY : MONTHLY} to UPI ID` },
                  { step: '3', text: lang === 'te' ? 'Screenshot తీసి WhatsApp చేయండి' : 'Screenshot & WhatsApp us to activate' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">{s.step}</span>
                    </div>
                    {s.text}
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp confirmation button */}
            <a
              href={`https://wa.me/919573500321?text=${encodeURIComponent(
                `Hi! I paid for VyaparMitra ${selectedPlan} plan.\nBusiness: ${business?.name}\nPhone: ${user?.phoneNumber}\nAmount: Rs.${selectedPlan === 'yearly' ? YEARLY : MONTHLY}\nPlease activate my account.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-green-500/30 mb-3"
            >
              <span className="text-xl">💬</span>
              {lang === 'te' ? 'Payment Screenshot WhatsApp చేయండి' : 'WhatsApp Payment Screenshot'}
            </a>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-3 text-gray-500 text-sm font-medium"
            >
              {lang === 'te' ? 'తర్వాత చేస్తాను' : 'I\'ll do this later'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
