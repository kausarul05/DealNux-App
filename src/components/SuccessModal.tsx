import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Images } from '../constants';

type Props = {
    visible: boolean;
    title: string;
    description: string;
    onClose?: () => void;
    autoCloseMs?: number; // optional
};

const spinnerDots = [
    { angle: 0, size: 12, opacity: 1 },
    { angle: 45, size: 11, opacity: 0.9 },
    { angle: 90, size: 10, opacity: 0.8 },
    { angle: 135, size: 9, opacity: 0.6 },
    { angle: 180, size: 8, opacity: 0.4 },
    { angle: 225, size: 7, opacity: 0.3 },
    { angle: 270, size: 6, opacity: 0.2 },
    { angle: 315, size: 6, opacity: 0.1 },
];

const SuccessModal =({
    visible,
    title,
    description,
    onClose,
    autoCloseMs,
}: Props)=> {
    const isAndroid = Platform.OS === 'android';
    const [spinnerRotation, setSpinnerRotation] = useState(0);

    // rotate spinner only when visible
    useEffect(() => {
        if (!visible) {
            setSpinnerRotation(0);
            return;
        }
        const id = setInterval(() => {
            setSpinnerRotation((prev) => (prev + 45) % 360);
        }, 150);
        return () => clearInterval(id);
    }, [visible]);

    // optional auto close
    useEffect(() => {
        if (!visible || !autoCloseMs || !onClose) return;
        const t = setTimeout(onClose, autoCloseMs);
        return () => clearTimeout(t);
    }, [visible, autoCloseMs, onClose]);

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={StyleSheet.absoluteFill}>
                <BlurView
                    intensity={isAndroid ? 2 : 15}
                    experimentalBlurMethod="dimezisBlurView"
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.dim}>
                    <View style={styles.card}>
                        <Image source={Images.Success} resizeMode="contain" className='mt-10'/>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.desc}>{description}</Text>

                        <View style={styles.spinnerWrap} className='mb-10'>
                            {spinnerDots.map((dot, index) => {
                                const angle = (dot.angle + spinnerRotation) * (Math.PI / 180);
                                const radius = 20;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;

                                return (
                                    <View
                                        key={index}
                                        style={{
                                            position: 'absolute',
                                            width: dot.size,
                                            height: dot.size,
                                            borderRadius: dot.size / 2,
                                            backgroundColor: '#2355B6',
                                            opacity: dot.opacity,
                                            transform: [{ translateX: x }, { translateY: y }],
                                        }}
                                    />
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
export default SuccessModal;

const styles = StyleSheet.create({
    dim: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
    },
    desc: {
        fontSize: 18,
        color: '#636F85',
        textAlign: 'center',
        lineHeight: 24,
    },
    spinnerWrap: {
        width: 64,
        height: 64,
        marginTop: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
