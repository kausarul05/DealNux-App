// src/utils/navigationRef.ts
//
// A navigation reference usable from outside React components (e.g. the axios
// auth interceptor), so a dead session can send the user back to sign-in
// instead of leaving the app stuck on empty screens.

import { createNavigationContainerRef } from '@react-navigation/native'
import { AuthStackParamList } from '../Navigation/types'

export const navigationRef = createNavigationContainerRef<AuthStackParamList>()

/** Reset the app to the sign-in screen. Safe to call before navigation mounts. */
export const resetToSignIn = () => {
    if (!navigationRef.isReady()) return
    navigationRef.reset({ index: 0, routes: [{ name: 'SignIn' }] })
}
