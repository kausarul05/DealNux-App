// components/KeyboardAvoider.tsx
//
// Drop-in replacement for KeyboardAvoidingView, with one consistent setup for
// the whole app.
//
// The screens had drifted into three different configurations, and the most
// common one — `behavior="height"` on Android — was the reason a focused field
// could end up hidden behind the keyboard. It shrinks the view at the same time
// as Android slides the window, so the two corrections fight each other. Android
// now uses `adjustResize` (app.json + AndroidManifest), which shrinks the window
// on its own, so no `behavior` should be applied there at all. iOS gets no such
// resize and still needs explicit padding.
//
// Layout is unchanged: this renders a single flex container exactly where the
// old KeyboardAvoidingView sat.
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

type Props = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /**
     * Extra distance between the keyboard and the content, in points. Only
     * meaningful on iOS — pass the height of any header rendered above this
     * view so the padding starts from the right place.
     */
    keyboardVerticalOffset?: number;
};

export const KeyboardAvoider: React.FC<Props> = ({
    children,
    style,
    keyboardVerticalOffset = 0,
}) => (
    <KeyboardAvoidingView
        style={style ?? { flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
    >
        {children}
    </KeyboardAvoidingView>
);

export default KeyboardAvoider;
