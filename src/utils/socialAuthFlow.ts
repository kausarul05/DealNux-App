// src/utils/socialAuthFlow.ts
//
// Decides where a social (Google / Apple) sign-in should land, so that it
// follows the same journey as a manual sign up:
//
//   sign up  ->  OtpAuth  ->  ProfileSetup  ->  MainTabs
//
// The backend drives this. It either returns explicit flags, or the same
// message strings the email/password login already relies on.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type NextStep =
    | { screen: 'OtpAuth'; params: { email?: string } }
    | { screen: 'ProfileSetup'; params: { email?: string } }
    | { screen: 'MainTabs'; params?: undefined };

const OTP_MESSAGE = 'Account not activated. Please verify OTP first!';
const PROFILE_MESSAGE = 'Profile setup not completed. Please complete your profile first!';

const truthy = (v: any) => v === true || v === 'true';

/** Pull the access token out of whichever shape the endpoint returns. */
export const extractAccessToken = (data: any): string | undefined =>
    data?.data?.access ?? data?.access ?? data?.token;

/** Persist whatever the backend gave us. Safe to call with a partial payload. */
export const storeAuthPayload = async (data: any) => {
    const access = extractAccessToken(data);
    if (access) await AsyncStorage.setItem('vToken', access);

    const refresh = data?.data?.refresh ?? data?.refresh;
    if (refresh) await AsyncStorage.setItem('vRefreshToken', refresh);

    const user = data?.data?.user ?? data?.user;
    if (user) await AsyncStorage.setItem('userData', JSON.stringify(user));
};

/**
 * Work out the next screen from a social-login response.
 *
 * `data` may be a success body or an error body — both carry the same signals,
 * so callers can pass `error.response.data` straight in.
 */
export const resolveNextStep = (data: any, email?: string): NextStep => {
    const body = data?.data ?? data ?? {};
    const message: string = data?.message ?? body?.message ?? '';
    const resolvedEmail = email ?? body?.email ?? body?.user?.email;

    // 1. Explicit flags win, if the backend sends them.
    const otpPending =
        truthy(body.requires_otp) ||
        truthy(body.otp_required) ||
        truthy(data?.requires_otp) ||
        truthy(data?.otp_required) ||
        body.is_verified === false ||
        body.email_verified === false ||
        body.is_active === false;

    if (otpPending) {
        return { screen: 'OtpAuth', params: { email: resolvedEmail } };
    }

    const profilePending =
        truthy(body.requires_profile_setup) ||
        truthy(body.profile_setup_required) ||
        body.profile_completed === false ||
        body.profile_setup_completed === false ||
        body.is_profile_complete === false;

    if (profilePending) {
        return { screen: 'ProfileSetup', params: { email: resolvedEmail } };
    }

    // 2. Fall back to the message strings the email login already keys off.
    if (message === OTP_MESSAGE || /verify otp/i.test(message)) {
        return { screen: 'OtpAuth', params: { email: resolvedEmail } };
    }

    if (message === PROFILE_MESSAGE || /profile setup/i.test(message)) {
        return { screen: 'ProfileSetup', params: { email: resolvedEmail } };
    }

    // 3. A brand new social account that the backend hasn't finished setting up
    //    still needs a profile, even when it hands back a token.
    if (truthy(body.is_new_user) || truthy(data?.is_new_user)) {
        return { screen: 'ProfileSetup', params: { email: resolvedEmail } };
    }

    // 4. No token means we cannot enter the app - profile setup issues one.
    if (!extractAccessToken(data)) {
        return { screen: 'ProfileSetup', params: { email: resolvedEmail } };
    }

    return { screen: 'MainTabs' };
};
