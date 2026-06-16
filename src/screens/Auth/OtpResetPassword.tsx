import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IPA_BASE, OTP_AUTH } from '@env';
import axios from 'axios';
import { AuthStackParamList } from '../../Navigation/types';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Images } from '../../constants';

const { width, height } = Dimensions.get('window');

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

interface RouteParams {
    email?: string;
}

const API_BASE_URL = IPA_BASE;
const END_POINTS = OTP_AUTH;

const OtpResetPassword = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const route = useRoute();
    const params = route.params as RouteParams;

    const email = params.email

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [code, setCode] = useState<string[]>(['', '', '', '']);
    const [timer, setTimer] = useState(60);


    const [isVerifying, setIsVerifying] = useState(false);

    const inputsRef = useRef<TextInput[]>([]);

    useEffect(() => {
        inputsRef.current = inputsRef.current.slice(0, 4);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (timer <= 0) return;
        const t = setInterval(() => setTimer((prev) => prev - 1), 1000);
        return () => clearInterval(t);
    }, [timer]);



    const handleChange = (text: string, index: number) => {
        const numericText = text.replace(/[^0-9]/g, '');
        const newCode = [...code];
        newCode[index] = numericText;
        setCode(newCode);

        // Move to next input
        if (numericText && index < 3) {
            setTimeout(() => inputsRef.current[index + 1]?.focus(), 10);
        }

        // Auto-submit when last digit entered
        if (numericText && index === 3) {
            const enteredCode = newCode.join('');
            if (enteredCode.length === 4) {
                handleSubmit(enteredCode);

            }
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
            setTimeout(() => inputsRef.current[index - 1]?.focus(), 10);
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
                {
                    email: params.email,
                    otp: enteredCode,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000,
                }
            );

            const data = res.data;
            if (data?.success === true) {
                setTimeout(() => {
                    navigation.navigate('CreateNewPassword', {
                        email: params.email,
                    } as any);
                }, 1500);
            } else {
                const msg = data?.message || 'Invalid OTP';
                Alert.alert('OTP Failed', msg);
                setCode(['', '', '', '']);
                setTimeout(() => inputsRef.current[0]?.focus(), 50);
            }
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Something went wrong';

            Alert.alert('OTP Failed', msg);
            setCode(['', '', '', '']);
            setTimeout(() => inputsRef.current[0]?.focus(), 50);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyPress = () => {
        const entered = code.join('');
        if (entered.length !== 4) return;
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
        setTimeout(() => inputsRef.current[0]?.focus(), 50);
    };

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5 flex-1">
                <AppHeader left={() => <BackButton />} />

                <View style={styles.logoContainer}>
                    <Image source={Images.Logo} style={styles.logoImage} resizeMode="contain" />
                </View>

                <View className="mt-10 flex-1">
                    <Text className="text-3xl text-center font-bold">Verification Code</Text>
                    <Text className="text-xl text-center text-[#636F85] my-4">
                        Enter the verification code that we have sent to your email.
                    </Text>

                    <View className="flex-row justify-between my-10">
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
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(text) => handleChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                selectTextOnFocus
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>

                    <View style={styles.optionsRow}>
                        <View className="flex-row">
                            <Text style={styles.rememberMeText}>Didn't receive the code?</Text>

                            <Text
                                style={styles.rememberMeText}
                                className={canResend ? 'text-[#EB4335]' : 'text-[#EB4335]/50'}
                                onPress={handleResend}
                            >
                                {' '}
                                Resend code
                            </Text>
                        </View>

                        <View className="flex-row mt-2">
                            <Text style={styles.forgotPassword}>Resend code at </Text>
                            <Text style={styles.forgotPassword} className="text-[#2355b6]">
                                {formatTime(timer)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.mainButton}
                        onPress={() => navigation.navigate("CreateNewPassword")}
                        activeOpacity={0.9}

                    >
                        <Text style={styles.mainButtonText}>
                            {isVerifying ? 'Verifying...' : 'Verify OTP'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default OtpResetPassword;

const styles = StyleSheet.create({
    logoContainer: {
        alignItems: 'center',
        paddingTop: height * 0,
    },
    logoImage: {
        width: width * 0.4,
        height: height * 0.1,
    },
    otpInput: {
        width: 64,
        height: 64,
        textAlign: 'center',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: 'bold',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },
    optionsRow: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    rememberMeText: {
        fontSize: 16,
    },
    forgotPassword: {
        fontSize: 16,
    },
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 56,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
