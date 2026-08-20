// Shared look for the Sign In / Sign Up screens.
//
// The two screens had drifted apart: three different blues (#2355B6, #2563EB,
// #1D4ED8), links in raw `red` and `#E74C3C`, a teal checkbox border, and radii
// of 12 and 16 side by side. They are the first thing a new user sees, so the
// palette is pinned here and both screens read from it. Layout is untouched —
// this only governs colour, radius, type scale and elevation.
import { Platform } from 'react-native';

export const AUTH = {
    // DealNux blue, the same one used by the tab bar and the rest of the app.
    primary: '#2563EB',
    primaryPressed: '#1D4ED8',

    page: '#F9F9FB',
    surface: '#FFFFFF',

    heading: '#0F172A',
    body: '#334155',
    muted: '#64748B',
    faint: '#94A3B8',
    placeholder: '#94A3B8',

    border: '#E2E8F0',
    borderFocus: '#2563EB',
    divider: '#E5E9F0',

    radius: 14,
} as const;

// One elevation recipe so the primary button lifts the same way on both screens.
export const AUTH_BUTTON_SHADOW = Platform.select({
    ios: {
        shadowColor: AUTH.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.24,
        shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
});

// Applied to an input row while its field has focus.
//
// Android gets no elevation here on purpose. Elevation promotes the row to its
// own rendering layer, and toggling it on the View that wraps a TextInput makes
// the field lose focus the moment it gains it — the keyboard stays up but every
// keystroke after the first is dropped. The border colour alone is the focus
// cue there; iOS shadows have no such side effect.
export const AUTH_INPUT_FOCUS_SHADOW = Platform.select({
    ios: {
        shadowColor: AUTH.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },
    default: {},
});
