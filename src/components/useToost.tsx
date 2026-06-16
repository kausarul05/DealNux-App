import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
    Animated,
    BackHandler,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastAction = 'dismiss' | 'back' | 'close-app' | 'custom';
export type ToastStyle = 'top' | 'center';

interface ToastButton {
    text: string;
    action: ToastAction;
    onPress?: () => void;
}

interface ToastConfig {
    message: string;
    type?: ToastType;
    duration?: number | null;
    buttons?: ToastButton[];
    style?: ToastStyle;
}

interface ToastHookReturn {
    show: (config: ToastConfig | string, type?: ToastType, duration?: number | null, buttons?: ToastButton[], style?: ToastStyle) => void;
    visible: boolean;
    message: string;
    type: ToastType;
    fadeAnim: Animated.Value;
    buttons: ToastButton[];
    style: ToastStyle;
    hide: () => void;
}

interface ToastProps {
    visible: boolean;
    message: string;
    type: ToastType;
    fadeAnim: Animated.Value;
    buttons: ToastButton[];
    style: ToastStyle;
    onHide: () => void;
}

const { width } = Dimensions.get('window');

// Toast Hook
export const useToast = (): ToastHookReturn => {
    const [visible, setVisible] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [type, setType] = useState<ToastType>('info');
    const [buttons, setButtons] = useState<ToastButton[]>([]);
    const [style, setStyle] = useState<ToastStyle>('top');
    const fadeAnim = useState(new Animated.Value(0))[0];

    const hide = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    };

    const show = (
        config: ToastConfig | string,
        toastType: ToastType = 'info',
        duration: number | null = 3000,
        toastButtons?: ToastButton[],
        toastStyle: ToastStyle = 'top'
    ): void => {
        let finalButtons: ToastButton[] = [];
        let finalDuration = duration;
        let finalStyle = toastStyle;

        if (typeof config === 'string') {
            setMessage(config);
            setType(toastType);
            finalButtons = toastButtons || [];
            finalStyle = toastStyle;
        } else {
            setMessage(config.message);
            setType(config.type || 'info');
            finalButtons = config.buttons || [];
            finalStyle = config.style || 'top';
            finalDuration = config.duration !== undefined ? config.duration : 3000;
        }

        setButtons(finalButtons);
        setStyle(finalStyle);
        setVisible(true);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        if (finalDuration && (finalButtons.length === 0 || finalStyle === 'top')) {
            setTimeout(hide, finalDuration);
        }
    };

    return { show, visible, message, type, fadeAnim, buttons, style, hide };
};

// Toast Component
export const Toast: React.FC<ToastProps> = ({ visible, message, type, fadeAnim, buttons, style, onHide }) => {
    const navigation = useNavigation();

    if (!visible) return null;

    const bgColor: Record<ToastType, string> = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    };

    const handleButtonPress = (button: ToastButton) => {
        switch (button.action) {
            case 'dismiss':
                onHide();
                break;
            case 'back':
                onHide();
                if (navigation.canGoBack()) {
                    navigation.goBack();
                }
                break;
            case 'close-app':
                onHide();
                BackHandler.exitApp();
                break;
            case 'custom':
                onHide();
                if (button.onPress) {
                    button.onPress();
                }
                break;
        }
    };

    // Top style (normal toast)
    if (style === 'top') {
        return (
            <Animated.View
                style={[
                    styles.topContainer,
                    {
                        backgroundColor: bgColor[type],
                        opacity: fadeAnim,
                        top: Platform.OS === 'ios' ? 60 : 40,
                    }
                ]}
            >
                <Text style={styles.text}>{message}</Text>

                {buttons.length > 0 && (
                    <View style={styles.buttonContainer}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.button}
                                onPress={() => handleButtonPress(button)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.buttonText}>{button.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Animated.View>
        );
    }

    // Center style (modal with blur) - Works on both iOS and Android
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onHide}
        >
            <View style={styles.modalOverlay}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 100 : 40}
                    tint="dark"
                    style={styles.blurView}
                    experimentalBlurMethod="dimezisBlurView" // Better Android blur
                >
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => { }}
                    />
                    <Animated.View
                        style={[
                            styles.centerContainer,
                            {
                                backgroundColor: bgColor[type],
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        <Text style={styles.centerText}>{message}</Text>

                        <View style={styles.centerButtonContainer}>
                            {buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.centerButton,
                                        buttons.length === 1 && styles.centerButtonFull
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.centerButtonText}>{button.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Top style (normal toast)
    topContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    text: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 12,
    },
    button: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginLeft: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    // Center style (modal with blur)
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurView: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fallback background
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    centerContainer: {
        width: width - 80,
        maxWidth: 400,
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    centerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    centerButtonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    centerButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
    },
    centerButtonFull: {
        flex: 1,
    },
    centerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});