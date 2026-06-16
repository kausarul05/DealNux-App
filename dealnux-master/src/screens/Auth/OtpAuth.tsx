import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IPA_BASE, OTP_AUTH } from '@env';
import axios from 'axios';
import { AuthStackParamList } from '../../Navigation/types';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { Images } from '../../constants';

const API_BASE_URL = IPA_BASE;
const END_POINTS = OTP_AUTH;

const { width, height } = Dimensions.get('window');

interface RouteParams {
    email?: string;
}

const OtpAuth = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const route = useRoute();
    const params = route.params as RouteParams;

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [code, setCode] = useState<string[]>(['', '', '', '']);
    const [timer, setTimer] = useState(60);
    const [isVerifying, setIsVerifying] = useState(false);

    const inputsRef = useRef<TextInput[]>([]);

    useEffect(() => {
        inputsRef.current = inputsRef.current.slice(0, 4);
    }, []);

    useEffect(() => {
        if (timer <= 0) return;
        const t = setInterval(() => setTimer((prev) => prev - 1), 1000);
        return () => clearInterval(t);
    }, [timer]);

    useEffect(() => {
        const t = setTimeout(() => inputsRef.current[0]?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    const handleChange = (text: string, index: number) => {
        const numericText = text.replace(/[^0-9]/g, '');
        const newCode = [...code];
        newCode[index] = numericText;
        setCode(newCode);
        if (numericText && index < 3) {
            requestAnimationFrame(() => inputsRef.current[index + 1]?.focus());
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            requestAnimationFrame(() => inputsRef.current[index - 1]?.focus());
        }
    };

    const handleSubmit = async (enteredCode: string) => {
        if (!params?.email) {
            Alert.alert('Error', 'Email missing. Please go back and try again.');
            return;
        }
        if (enteredCode.length !== 4) {
            Alert.alert('Error', 'Please enter the full 4-digit OTP.');
            return;
        }
        try {
            setIsVerifying(true);
            const res = await axios.post(
                `${API_BASE_URL}${END_POINTS}`,
                { email: params.email, otp: enteredCode },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            const data = res.data;
            if (data?.success === true) {
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.navigate('ProfileSetup', { email: params.email } as any);
                }, 1500);
            } else {
                Alert.alert('OTP Failed', data?.message || 'Invalid OTP');
                setCode(['', '', '', '']);
                requestAnimationFrame(() => inputsRef.current[0]?.focus());
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong';
            Alert.alert('OTP Failed', msg);
            setCode(['', '', '', '']);
            requestAnimationFrame(() => inputsRef.current[0]?.focus());
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyPress = () => {
        const entered = code.join('');
        if (entered.length !== 4) {
            Alert.alert('Error', 'Please enter the full 4-digit OTP.');
            return;
        }
        handleSubmit(entered);
    };

    const formatTime = (sec: number) => {
        const s = Math.max(0, sec);
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    };

    const canResend = timer <= 0;

    const handleResend = () => {
        if (!canResend) return;
        setTimer(60);
        setCode(['', '', '', '']);
        requestAnimationFrame(() => inputsRef.current[0]?.focus());
    };

    return (
        // ✅ FIX 1: Added 'bottom' edge
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
            {/* ✅ FIX 2: 'height' for Android */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* ✅ FIX 3: Wrap in ScrollView so content scrolls above keyboard */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.page}>
                        <AppHeader left={() => <BackButton />} />

                        <View style={styles.logoContainer}>
                            <Image source={Images.Logo} style={styles.logoImage} resizeMode="contain" />
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.title}>Verification Code</Text>
                            <Text style={styles.subTitle}>
                                Enter the verification code that we have sent to your email.
                            </Text>

                            <View style={styles.otpRow}>
                                {code.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        placeholder="0"
                                        placeholderTextColor="#6B7280"
                                        ref={(ref) => {
                                            if (ref) inputsRef.current[index] = ref;
                                        }}
                                        style={[
                                            styles.otpInput,
                                            { borderColor: digit ? '#2355B6' : '#E5E7EB' },
                                        ]}
                                        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChangeText={(text) => handleChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        editable={!isVerifying}
                                        textAlignVertical="center"
                                        autoFocus={false}
                                        selectTextOnFocus
                                        returnKeyType="done"
                                    />
                                ))}
                            </View>

                            <View style={styles.optionsRow}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <Text style={styles.infoText}>Didn't receive the code?</Text>
                                    <Text
                                        style={[styles.infoText, { color: canResend ? '#EB4335' : 'rgba(235,67,53,0.5)' }]}
                                        onPress={handleResend}
                                    >
                                        {' '}Resend code
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <Text style={styles.timeText}>Resend code at </Text>
                                    <Text style={[styles.timeText, { color: '#2355B6' }]}>{formatTime(timer)}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.mainButton, { opacity: isVerifying ? 0.7 : 1 }]}
                                onPress={handleVerifyPress}
                                activeOpacity={0.9}
                                disabled={isVerifying}
                            >
                                {isVerifying ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={[styles.mainButtonText, { marginLeft: 10 }]}>Verifying...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.mainButtonText}>Verify OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <SuccessModal
                visible={showSuccessModal}
                title="Successful!"
                description="Your registration was completed successfully"
                onClose={() => setShowSuccessModal(false)}
            />
        </SafeAreaView>
    );
};

export default OtpAuth;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    page: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        paddingTop: 0,
    },
    logoImage: {
        width: width * 0.4,
        height: height * 0.1,
    },
    content: {
        marginTop: 24,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        textAlign: 'center',
        color: '#111827',
    },
    subTitle: {
        fontSize: 18,
        textAlign: 'center',
        color: '#636F85',
        marginTop: 12,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 28,
        marginBottom: 10,
    },
    otpInput: {
        width: 64,
        height: 64,
        textAlign: 'center',
        textAlignVertical: 'center',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: 'bold',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
        color: '#111827',
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
    },
    optionsRow: {
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 16,
        color: '#111827',
    },
    timeText: {
        fontSize: 16,
        color: '#111827',
    },
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 24,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});