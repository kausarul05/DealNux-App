// hooks/useLowestPlanPrice.ts
//
// The upsell modals used to hard-code a monthly price, which drifted from the
// real plans (they showed $7.99 and $4.99 while the cheapest plan is $5.99).
// This reads the live plan list and returns the cheapest paid monthly price so
// the figure on screen always matches what the user will actually be charged.
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'

const PLANS_ENDPOINT = 'payment/plans/'

type ApiPlan = {
    plan_type: string
    price: string
}

/**
 * Cheapest paid monthly plan price, or null until it loads / if it cannot be
 * read. Callers should hide the price line rather than show a guess when null.
 */
export const useLowestPlanPrice = (enabled = true): number | null => {
    const [price, setPrice] = useState<number | null>(null)

    useEffect(() => {
        if (!enabled || price !== null) return
        let cancelled = false

        ;(async () => {
            try {
                const token = await AsyncStorage.getItem('vToken')
                const res = await axios.get(`${IPA_BASE}${PLANS_ENDPOINT}`, {
                    headers: {
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    timeout: 15000,
                })
                if (cancelled) return

                const plans: ApiPlan[] = res?.data?.data ?? []
                const monthly = plans
                    .filter((p) => p.plan_type?.includes('MONTHLY'))
                    .map((p) => Number(p.price))
                    .filter((n) => Number.isFinite(n) && n > 0)

                if (monthly.length) setPrice(Math.min(...monthly))
            } catch {
                // Leave it null; the caller renders nothing rather than a wrong price.
            }
        })()

        return () => {
            cancelled = true
        }
    }, [enabled, price])

    return price
}

export default useLowestPlanPrice
