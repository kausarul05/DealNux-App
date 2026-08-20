// hooks/useKeyboardHeight.ts
//
// Current on-screen keyboard height, or 0 while it is closed.
//
// Needed because a React Native `Modal` is its own window: Android's
// `adjustResize` never shrinks it, so a chat input pinned to the bottom of a
// modal sits behind the keyboard no matter how KeyboardAvoidingView is
// configured. Measuring the keyboard directly works in modals and on plain
// screens alike.
import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

export const useKeyboardHeight = (): number => {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        // iOS fires the "will" events early enough to move in step with the
        // keyboard animation; Android only ever fires the "did" pair.
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
            setHeight(e.endCoordinates?.height ?? 0);
        });
        const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

    return height;
};

export default useKeyboardHeight;
