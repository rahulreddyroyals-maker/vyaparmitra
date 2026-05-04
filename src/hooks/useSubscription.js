// src/hooks/useSubscription.js
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { differenceInDays } from 'date-fns'

export const PLAN_LIMITS = {
  free: { invoices: 10, products: 5, customers: 3 },
  trial: { invoices: 999, products: 999, customers: 999 },
  premium: { invoices: 999, products: 999, customers: 999 },
}

export function useSubscription() {
  const { business } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) return
    load()
  }, [business])

  const load = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle()
    setSubscription(data)
    setLoading(false)
  }

  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, differenceInDays(new Date(subscription.trial_end), new Date()))
    : 0

  const isPremium = subscription?.status === 'active'
  const isTrial = subscription?.status === 'trial' && trialDaysLeft > 0
  const isTrialExpired = subscription?.status === 'trial' && trialDaysLeft <= 0
  const isFree = !subscription || isTrialExpired

  const currentPlan = isPremium ? 'premium' : isTrial ? 'trial' : 'free'
  const limits = PLAN_LIMITS[currentPlan]

  const canUseFeature = (feature) => {
    if (isPremium || isTrial) return true
    const gatedFeatures = ['whatsapp_api', 'gst_report', 'auto_reminders', 'advanced_analytics']
    return !gatedFeatures.includes(feature)
  }

  const isAtLimit = (resource, currentCount) => {
    if (isPremium || isTrial) return false
    return currentCount >= limits[resource]
  }

  return {
    subscription, loading, isPremium, isTrial, isTrialExpired,
    isFree, currentPlan, limits, trialDaysLeft,
    canUseFeature, isAtLimit, reload: load,
  }
}
