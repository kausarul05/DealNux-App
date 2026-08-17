// src/utils/authInterceptor.ts
//
// Global axios interceptor that keeps the user signed in.
//
// THE BUG THIS FIXES: the app stored `vRefreshToken` at login but never used
// it. Once the access token (`vToken`) expired (~30 min), every authenticated
// request started returning 401 and the screens showed "No products found" /
// "Couldn't Load Dashboard" / contact failures — and eventually crashed on the
// null data. This interceptor transparently refreshes the access token on the
// first 401 and retries the original request, so the session no longer dies.
//
// It reads the refresh endpoint from `REFRESH_TOKEN` in .env. If that value is
// blank (not yet configured by the backend), the interceptor stays dormant and
// behaves exactly as before — so shipping this is safe even before the backend
// wires up the endpoint.

import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { IPA_BASE, REFRESH_TOKEN } from '@env'
import { resetToSignIn } from './navigationRef'

// The refresh endpoint, e.g. IPA_BASE + "account/login/refresh/".
// Empty REFRESH_TOKEN => refresh disabled (safe no-op).
const REFRESH_URL = REFRESH_TOKEN ? `${IPA_BASE}${REFRESH_TOKEN}` : ''

// Pull the new access token out of whatever shape the endpoint returns.
const extractAccess = (data: any): string | undefined =>
    data?.access ?? data?.data?.access ?? data?.token ?? data?.data?.token

// ─── Single-flight refresh ────────────────────────────────────────────────
// If several requests 401 at once, only ONE refresh call goes out; the rest
// wait for it and then retry with the fresh token.
let isRefreshing = false
let waiters: Array<(token: string | null) => void> = []

const notifyWaiters = (token: string | null) => {
    waiters.forEach((cb) => cb(token))
    waiters = []
}

const refreshAccessToken = async (): Promise<string | null> => {
    const refresh = await AsyncStorage.getItem('vRefreshToken')
    if (!refresh || !REFRESH_URL) return null

    try {
        // Bare axios (not the intercepted default flow re-entering itself).
        const res = await axios.post(
            REFRESH_URL,
            { refresh },
            { headers: { 'Content-Type': 'application/json' } }
        )
        const newAccess = extractAccess(res.data)
        if (newAccess) {
            await AsyncStorage.setItem('vToken', newAccess)
            // Some backends rotate the refresh token too.
            const rotated = res.data?.refresh ?? res.data?.data?.refresh
            if (rotated) await AsyncStorage.setItem('vRefreshToken', rotated)
            return newAccess
        }
        return null
    } catch {
        return null
    }
}

export const setupAuthInterceptor = () => {
    axios.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const original = error.config as
                | (AxiosRequestConfig & { _retry?: boolean })
                | undefined
            const status = error.response?.status

            // Only act on 401s we can actually recover from.
            const isAuthError = status === 401
            const isRefreshCall = original?.url === REFRESH_URL
            const canRetry =
                isAuthError &&
                !!original &&
                !original._retry &&
                !isRefreshCall &&
                !!REFRESH_URL

            if (!canRetry) {
                return Promise.reject(error)
            }

            original._retry = true

            // Wait for an in-flight refresh, or start one.
            let newToken: string | null
            if (isRefreshing) {
                newToken = await new Promise<string | null>((resolve) =>
                    waiters.push(resolve)
                )
            } else {
                isRefreshing = true
                newToken = await refreshAccessToken()
                isRefreshing = false
                notifyWaiters(newToken)
            }

            if (!newToken) {
                // Refresh failed — the session is truly over (refresh token
                // expired/revoked). Clear it and send the user to sign-in, so the
                // app never sits in the broken "logged in but nothing loads"
                // state that required a manual logout.
                await AsyncStorage.multiRemove(['vToken', 'vRefreshToken'])
                resetToSignIn()
                return Promise.reject(error)
            }

            // Replay the original request with the fresh token.
            original.headers = {
                ...(original.headers as any),
                Authorization: `Bearer ${newToken}`,
            }
            return axios(original)
        }
    )
}
