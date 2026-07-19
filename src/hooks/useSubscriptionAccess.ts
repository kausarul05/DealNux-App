// src/hooks/useSubscriptionAccess.ts
//
// Single source of truth for "is this user allowed to use a paid feature".
// Home.tsx / MyOrders.tsx each hit payment/subscription/status/ inline; this
// wraps the same call so gated features agree on the answer.

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'

const STATUS_ENDPOINT = `${IPA_BASE}payment/subscription/status/`

export type SubscriptionStatus = {
    plan_name?: string
    status?: string
    is_active?: boolean
    has_used_trial?: boolean
    days_remaining?: number | null
    features?: string[]
    has_barcode_scanning?: boolean
}

// A trial is still a paid-tier entitlement - the client wants scanning to work
// during the trial and stop only once it lapses.
const ENTITLED_STATUSES = ['ACTIVE', 'TRIAL', 'TRIALING', 'ON_TRIAL', 'IN_TRIAL']

const mentionsBarcode = (features?: string[]) =>
    !!features?.some(f => /barcode|scan/i.test(f))

/** True when the account currently has an active plan or a running trial. */
export const hasActiveEntitlement = (status: SubscriptionStatus | null) => {
    if (!status) return false
    if (status.is_active === true) return true
    const s = status.status?.toUpperCase?.()
    return !!s && ENTITLED_STATUSES.includes(s)
}

/** True when the account may use barcode scanning right now. */
export const canScanBarcode = (status: SubscriptionStatus | null) => {
    if (!hasActiveEntitlement(status)) return false

    // If the backend is explicit about the capability, believe it.
    if (typeof status?.has_barcode_scanning === 'boolean') {
        return status.has_barcode_scanning
    }

    // Some plans list capabilities as free text instead.
    if (status?.features?.length) {
        return mentionsBarcode(status.features)
    }

    // Active plan, no capability detail - allow rather than lock out a payer.
    return true
}

export const useSubscriptionAccess = () => {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            const token = await AsyncStorage.getItem('vToken')
            if (!token) {
                setStatus(null)
                return
            }

            const res = await axios.get(STATUS_ENDPOINT, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            })

            const data = res?.data?.data ?? res?.data ?? null
            console.log('📊 Subscription status:', JSON.stringify(data))
            setStatus(data)
        } catch (error: any) {
            console.error('❌ Subscription status error:', error?.response?.data || error)
            setStatus(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return {
        loading,
        status,
        refresh,
        isEntitled: hasActiveEntitlement(status),
        canScan: canScanBarcode(status),
    }
}
