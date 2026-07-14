// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import toast from 'react-hot-toast'
import {
  ArrowLeft, User, Phone, Building2, Edit2,
  LogOut, Crown, ChevronRight, Check, Camera,
  Shield, Bell, Globe, HelpCircle, Star
} from 'lucide-react'

const BUSINESS_TYPES = ['Retailer', 'Distributor', 'Manufacturer', 'Wholesaler', 'Service Provider']

export default function ProfilePage() {
  const { user, business, setBusiness } = useAuth()
  const { lang, switchLang } = useLang()
  const navigate = useNavigate()

  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const [form, setForm] = useState({
    bizName: '',
    bizType: '',
    ownerName: '',
  })

  useEffect(() => {
    if (business) {
      setForm({
        bizName: business.name || '',
        bizType: business.type || '',
        ownerName: business.owner_name || user?.displayName || '',
      })
    }
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
  }

  const saveProfile = async () => {
    if (!form.bizName.trim()) return toast.error('Business name is required')
    setSaving(true)
    const { data, error } = await supabase
      .from('businesses')
      .update({
        name: form.bizName.trim(),
        type: form.bizType,
        owner_name: form.ownerName.trim(),
      })
      .eq('id', business.id)
      .select()
      .single()
    setSaving(false)
    if (error) {
      toast.error('Failed to save: ' + error.message)
      return
    }
    setBusiness(data)
    setEditMode(false)
    toast.success(lang === 'te' ? 'ప్రొఫైల్ అప్‌డేట్ అయింది!' : 'Profile updated!')
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/auth')
  }

  const isPremium = subscription?.status === 'active'
  const isTrial = subscription?.status === 'trial'
  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, Math.floor((new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  const initial = (business?.name || 'V')[0].toUpperCase()

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="bg-navy text-white px-4 pt-4 pb-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-300 text-sm mb-4">
          <ArrowLeft size={16} />
          {lang === 'te' ? 'వెనుకకు' : 'Back'}
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {initial}
              </div>
              {isPremium && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Crown size={12} className="text-navy" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">
                {business?.name || 'My Business'}
              </h2>
              <p className="text-blue-300 text-sm mt-0.5">
                {business?.type || 'Business'}
              </p>
              <p className="text-blue-400 text-xs mt-0.5 flex items-center gap-1">
                <Phone size={10} />
                {user?.phoneNumber || (lang === 'te' ? 'ఫోన్ లేదు' : 'No phone')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="bg-white/10 p-2.5 rounded-xl"
          >
            <Edit2 size={16} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-3">

        {/* Subscription Status */}
        <div
          onClick={() => navigate('/pricing')}
          className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer shadow-lg ${
            isPremium
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
              : isTrial
              ? 'bg-gradient-to-r from-primary to-blue-700'
              : 'bg-white border border-gray-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isPremium || isTrial ? 'bg-white/20' : 'bg-primary/10'
          }`}>
            <Crown size={20} className={isPremium ? 'text-white' : isTrial ? 'text-white' : 'text-primary'} />
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${isPremium || isTrial ? 'text-white' : 'text-navy'}`}>
              {isPremium
                ? (lang === 'te' ? '👑 Premium సభ్యుడు' : '👑 Premium Member')
                : isTrial
                ? (lang === 'te' ? `🎁 ట్రయల్: ${trialDaysLeft} రోజులు మిగిలాయి` : `🎁 Trial: ${trialDaysLeft} days left`)
                : (lang === 'te' ? 'ఉచిత ప్లాన్ • Upgrade చేయండి' : 'Free Plan • Upgrade to Premium')}
            </p>
            <p className={`text-xs mt-0.5 ${isPremium || isTrial ? 'text-white/80' : 'text-gray-500'}`}>
              {isPremium
                ? (lang === 'te' ? 'అన్ని ఫీచర్లు అన్‌లాక్' : 'All features unlocked')
                : isTrial
                ? (lang === 'te' ? 'Rs.599/నెల కు అప్‌గ్రేడ్ చేయండి' : 'Upgrade at Rs.599/month')
                : (lang === 'te' ? 'Rs.599/నెల • 30 రోజుల ఉచిత ట్రయల్' : 'Rs.599/month • 30-day free trial')}
            </p>
          </div>
          <ChevronRight size={18} className={isPremium || isTrial ? 'text-white/60' : 'text-gray-400'} />
        </div>

        {/* Edit Profile Form */}
        {editMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <p className="font-bold text-navy">
              {lang === 'te' ? 'ప్రొఫైల్ సవరించండి' : 'Edit Profile'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                {lang === 'te' ? 'వ్యాపారం పేరు' : 'Business Name'} *
              </label>
              <input
                value={form.bizName}
                onChange={e => setForm(f => ({ ...f, bizName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy text-sm"
                placeholder="e.g. Lucky Cement Store"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                {lang === 'te' ? 'యజమాని పేరు' : 'Owner Name'}
              </label>
              <input
                value={form.ownerName}
                onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-navy text-sm"
                placeholder={lang === 'te' ? 'మీ పేరు' : 'Your name'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                {lang === 'te' ? 'వ్యాపార రకం' : 'Business Type'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, bizType: type }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      form.bizType === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600"
              >
                {lang === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-primary/30"
              >
                {saving
                  ? (lang === 'te' ? 'సేవ్...' : 'Saving...')
                  : (lang === 'te' ? 'సేవ్ చేయండి' : 'Save')}
              </button>
            </div>
          </div>
        )}

        {/* Business Info Card */}
        {!editMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">
              {lang === 'te' ? 'వ్యాపార వివరాలు' : 'Business Details'}
            </p>
            {[
              {
                icon: Building2,
                label: lang === 'te' ? 'వ్యాపారం పేరు' : 'Business Name',
                value: business?.name,
                color: 'bg-blue-50 text-primary'
              },
              {
                icon: User,
                label: lang === 'te' ? 'యజమాని పేరు' : 'Owner Name',
                value: business?.owner_name || (lang === 'te' ? 'సెట్ చేయలేదు' : 'Not set'),
                color: 'bg-purple-50 text-purple-600'
              },
              {
                icon: Phone,
                label: lang === 'te' ? 'ఫోన్' : 'Phone',
                value: user?.phoneNumber || (lang === 'te' ? 'లేదు' : 'Not available'),
                color: 'bg-green-50 text-success'
              },
              {
                icon: Building2,
                label: lang === 'te' ? 'వ్యాపార రకం' : 'Business Type',
                value: business?.type || (lang === 'te' ? 'సెట్ చేయలేదు' : 'Not set'),
                color: 'bg-orange-50 text-orange-600'
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-semibold text-navy mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
            <button
              onClick={() => setEditMode(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-primary/5 text-primary rounded-xl text-sm font-semibold"
            >
              <Edit2 size={14} /> {lang === 'te' ? 'వివరాలు సవరించండి' : 'Edit Details'}
            </button>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-xs font-bold text-gray-400 uppercase px-4 pt-4 pb-2">
            {lang === 'te' ? 'సెట్టింగ్లు' : 'Settings'}
          </p>

          {/* Language */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Globe size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">
                  {lang === 'te' ? 'భాష' : 'Language'}
                </p>
                <p className="text-xs text-gray-400">
                  {lang === 'te' ? 'తెలుగు' : 'English'}
                </p>
              </div>
            </div>
            <button
              onClick={() => switchLang(lang === 'en' ? 'te' : 'en')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                lang === 'te'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {lang === 'te' ? 'తె → EN' : 'EN → తె'}
            </button>
          </div>

          {/* Reports */}
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center justify-between w-full px-4 py-3 border-b border-gray-50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Star size={16} className="text-success" />
              </div>
              <p className="text-sm font-semibold text-navy">
                {lang === 'te' ? 'నివేదికలు' : 'Reports & Analytics'}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>


        </div>

        {/* App Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">
            {lang === 'te' ? 'యాప్ గురించి' : 'About App'}
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl font-display">V</span>
            </div>
            <div>
              <p className="font-display font-bold text-navy">
                Vyapar<span className="text-success">Mitra</span>
              </p>
              <p className="text-xs text-gray-400">Version 1.0.0 • Made for Indian MSMEs</p>
            </div>
          </div>
          <a
            href="https://wa.me/919573500321?text=Hi! I need help with VyaparMitra."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-success font-medium py-2"
          >
            <HelpCircle size={16} />
            {lang === 'te' ? 'సహాయం కావాలా? WhatsApp చేయండి' : 'Need help? WhatsApp us'}
          </a>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 border border-red-100 text-red-500 font-bold rounded-2xl"
        >
          <LogOut size={18} />
          {lang === 'te' ? 'లాగ్ అవుట్' : 'Logout'}
        </button>

        <p className="text-center text-xs text-gray-300 pb-2">
          {user?.phoneNumber} • {business?.id?.slice(0, 8)}
        </p>
      </div>
    </div>
  )
}
