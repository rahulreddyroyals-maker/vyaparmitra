// src/pages/AuthPage.jsx
import { useState, useEffect, useRef } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { upsertUser } from '../lib/supabase'
import toast from 'react-hot-toast'

const LANGS = [
  { code: 'en', label: 'English', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🏷️' },
]

const T = {
  en: {
    tagline: 'Run Your Business,', tagline2: "We've Got Your Back.",
    phone: 'Enter your WhatsApp number', sendOtp: 'Send OTP',
    otp: 'Enter 6-digit OTP', verify: 'Verify & Continue',
    resend: 'Resend OTP', sending: 'Sending...', verifying: 'Verifying...',
    trust: 'Trusted by 10,000+ Indian businesses',
    features: ['WhatsApp First', 'Billing & Invoicing', 'Inventory Management', 'Customer & Payments'],
  },
  te: {
    tagline: 'మీ వ్యాపారం,', tagline2: 'మా తోడు.',
    phone: 'మీ WhatsApp నంబర్ ఇవ్వండి', sendOtp: 'OTP పంపండి',
    otp: '6-అంకెల OTP నమోదు చేయండి', verify: 'ధృవీకరించి కొనసాగండి',
    resend: 'OTP మళ్ళీ పంపండి', sending: 'పంపుతున్నాం...', verifying: 'ధృవీకరిస్తున్నాం...',
    trust: '10,000+ భారతీయ వ్యాపారాలు నమ్ముతున్నాయి',
    features: ['WhatsApp ముందుగా', 'బిల్లింగ్ & ఇన్వాయిసింగ్', 'ఇన్వెంటరీ నిర్వహణ', 'కస్టమర్ & చెల్లింపులు'],
  },
}

function initRecaptcha(onSuccess, onExpire) {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear() } catch (_) {}
    window.recaptchaVerifier = null
  }
  const el = document.getElementById('recaptcha-box')
  if (el) el.innerHTML = ''

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-box', {
    size: 'normal',
    callback: onSuccess,
    'expired-callback': onExpire,
  })
  window.recaptchaVerifier.render().catch(e => console.error('reCAPTCHA render:', e))
}

export default function AuthPage() {
  const [lang, setLang] = useState('en')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)
  const [captchaDone, setCaptchaDone] = useState(false)
  const t = T[lang]

  useEffect(() => {
    // Small delay so DOM element exists
    const timer = setTimeout(() => {
      initRecaptcha(
        () => setCaptchaDone(true),
        () => { setCaptchaDone(false); toast.error('reCAPTCHA expired, please check again') }
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const sendOtp = async () => {
    if (phone.length < 10) return toast.error('Enter a valid 10-digit number')
    if (!captchaDone) return toast.error('Please complete the reCAPTCHA checkbox first')
    setLoading(true)
    try {
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier)
      setConfirmResult(result)
      setStep('otp')
      toast.success('OTP sent! Check your SMS.')
    } catch (err) {
      console.error(err.code, err.message)
      setCaptchaDone(false)
      setTimeout(() => initRecaptcha(() => setCaptchaDone(true), () => setCaptchaDone(false)), 400)
      const msgs = {
        'auth/invalid-phone-number': 'Invalid phone number.',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes.',
        'auth/quota-exceeded': 'Daily SMS limit reached. Use test number below.',
        'auth/captcha-check-failed': 'reCAPTCHA check failed. Refresh and retry.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/billing-not-enabled': '💳 Firebase billing not enabled — use test number below.',
      }
      toast.error(msgs[err.code] || `OTP failed: ${err.code}`, { duration: 7000 })
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error('Enter the full 6-digit OTP')
    setLoading(true)
    try {
      const result = await confirmResult.confirm(otp)
      await upsertUser(result.user.uid, result.user.phoneNumber, '', lang)
      toast.success('Welcome to VyaparMitra! 🎉')
    } catch (err) {
      const msgs = {
        'auth/invalid-verification-code': 'Wrong OTP. Please check again.',
        'auth/code-expired': 'OTP expired. Go back and resend.',
      }
      toast.error(msgs[err.code] || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    setStep('phone'); setOtp(''); setConfirmResult(null); setCaptchaDone(false)
    setTimeout(() => initRecaptcha(() => setCaptchaDone(true), () => setCaptchaDone(false)), 400)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-[#1e3a6e] to-[#0f4c3a] flex flex-col lg:flex-row">
      {/* Left Branding */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 text-white">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-display font-bold text-primary">V</span>
            </div>
            <h1 className="text-4xl font-display font-bold">
              <span className="text-white">Vyapar</span><span className="text-success">Mitra</span>
            </h1>
          </div>
          <p className="text-blue-200 text-sm font-medium tracking-wider ml-1">आपका व्यापार, हमारा साथ</p>
        </div>
        <div className="text-center mb-10">
          <h2 className="text-5xl font-display font-bold leading-tight">
            {t.tagline}<br /><span className="text-success">{t.tagline2}</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {[{ icon: '💬', text: t.features[0] }, { icon: '🧾', text: t.features[1] },
            { icon: '📦', text: t.features[2] }, { icon: '👥', text: t.features[3] }]
            .map((f) => (
              <div key={f.text} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-2">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-sm font-medium text-blue-100">{f.text}</span>
              </div>
            ))}
        </div>
        <p className="mt-8 text-blue-300 text-sm">⭐ {t.trust}</p>
      </div>

      {/* Right Auth */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          {/* Language */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${lang === l.code ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-display font-bold text-navy">
              {step === 'phone' ? t.phone : t.otp}
            </h3>
          </div>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="flex">
                <span className="flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-600 font-medium text-sm whitespace-nowrap">
                  🇮🇳 +91
                </span>
                <input type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl text-navy font-medium focus:outline-none focus:border-primary text-lg tracking-wider"
                />
              </div>

              {/* reCAPTCHA — always visible, initialized on mount */}
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  ✅ Step 1: Check the box below, then click Send OTP
                </p>
                <div id="recaptcha-box" className="flex justify-center min-h-[78px]"></div>
              </div>

              <button onClick={sendOtp}
                disabled={loading || phone.length < 10 || !captchaDone}
                className="w-full py-4 bg-primary hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-primary/30">
                {loading ? t.sending : `✅ Step 2: ${t.sendOtp} →`}
              </button>

              {/* Test number */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">🧪 Test without real SMS:</p>
                <p className="text-xs text-amber-700">Phone: <strong>97015 63708</strong></p>
                <p className="text-xs text-amber-700">OTP: <strong>123456</strong></p>
                <p className="text-xs text-amber-600 mt-1">
                  Real SMS needs Firebase Blaze plan (pay-as-you-go)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">OTP sent to <strong>+91 {phone}</strong></p>
              <input type="number" value={otp} autoFocus
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-navy font-bold text-2xl text-center tracking-[0.5em] focus:outline-none focus:border-primary"
              />
              <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
                className="w-full py-4 bg-success hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-lg">
                {loading ? t.verifying : `${t.verify} ✓`}
              </button>
              <button onClick={goBack} className="w-full py-3 text-gray-500 text-sm hover:text-primary">
                ← Change number / {t.resend}
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-gray-400">
            By continuing, you agree to our Terms of Service & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
