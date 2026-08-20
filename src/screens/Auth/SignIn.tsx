import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, IPA_BASE, LOGIN } from '@env';
import { Entypo, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { resolveNextStep, storeAuthPayload } from '../../utils/socialAuthFlow';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import KeyboardAvoider from '../../components/KeyboardAvoider';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppleButtonSvg from '../../components/Apple';
import GoogleButtonSvg from '../../components/Google';
import SuccessModal from '../../components/SuccessModal';
import { Images } from '../../constants';
import { LOGO_ASPECT } from '../../constants/layout';
import { AUTH, AUTH_BUTTON_SHADOW, AUTH_INPUT_FOCUS_SHADOW } from '../../constants/authTheme';
import { AuthStackParamList } from '../../Navigation/types';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = IPA_BASE;
const END_POINTS = LOGIN;

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

const SignIn = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    // Which field is focused, so its border and icon can highlight.
    const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);

    // ─── Google Sign-In Setup ────────────────────────────────────
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iosClientId: GOOGLE_IOS_CLIENT_ID,
            offlineAccess: false,
        });
    }, []);


    useEffect(() => {
        const loadRememberedData = async () => {
            try {
                const savedRememberMe = await AsyncStorage.getItem('rememberMe');
                if (savedRememberMe !== null) {
                    const rememberMeValue = JSON.parse(savedRememberMe);
                    setRememberMe(rememberMeValue);
                    if (rememberMeValue) {
                        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
                        if (savedEmail) setEmail(savedEmail);
                    }
                }
            } catch (error) {
                console.error('Error loading remembered data:', error);
            }
        };
        loadRememberedData();
    }, []);



    const handleRememberMeChange = async (value: boolean) => {
        setRememberMe(value);
        try {
            await AsyncStorage.setItem('rememberMe', JSON.stringify(value));
            if (value && email.trim()) {
                await AsyncStorage.setItem('rememberedEmail', email.trim().toLowerCase());
            } else if (!value) {
                await AsyncStorage.removeItem('rememberedEmail');
            }
        } catch (error) {
            console.error('Error saving remember me data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const loadRememberedEmail = async () => {
                try {
                    if (rememberMe) {
                        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
                        if (savedEmail) setEmail(savedEmail);
                    }
                } catch (error) {
                    console.error('Error loading remembered email:', error);
                }
            };
            loadRememberedEmail();
        }, [rememberMe]),
    );

    useEffect(() => {
        const syncEmail = async () => {
            try {
                if (rememberMe) {
                    if (email.trim()) {
                        await AsyncStorage.setItem('rememberedEmail', email.trim().toLowerCase());
                    } else {
                        await AsyncStorage.removeItem('rememberedEmail');
                    }
                }
            } catch (e) {
                console.error('Error syncing remembered email:', e);
            }
        };
        syncEmail();
    }, [email, rememberMe]);

    // ─── Social login success handler ────────────────────────────────────────
    //     Mirrors the manual journey: OtpAuth -> ProfileSetup -> MainTabs, so a
    //     half-finished social account resumes where it left off.
    const handleSocialLoginSuccess = async (data: any, socialEmail?: string) => {
        await storeAuthPayload(data);

        const next = resolveNextStep(data, socialEmail);
        console.log('➡️ social auth next step:', next.screen, next.params);

        if (next.screen !== 'MainTabs') {
            navigation.navigate(next.screen as any, next.params as any);
            return;
        }

        setShowSuccessModal(true);
        setTimeout(() => {
            setShowSuccessModal(false);
            navigation.navigate('MainTabs' as any);
        }, 1500);
    };

    // ─── Google Sign-In ──────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);
            await GoogleSignin.hasPlayServices();

            const signInResult: any = await GoogleSignin.signIn();
            // v13+ returns { type, data: { user } }; older versions return { user }.
            const socialEmail: string | undefined =
                signInResult?.data?.user?.email ?? signInResult?.user?.email;

            const tokens = await GoogleSignin.getTokens();

            if (!tokens?.accessToken) {
                Alert.alert('Error', 'Could not get Google access token.');
                return;
            }

            const res = await axios.post(
                `${API_BASE_URL}account/google/`,
                { access_token: tokens.accessToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            await handleSocialLoginSuccess(res.data, socialEmail);
        } catch (error: any) {
            const body = error?.response?.data;
            if (body) {
                const next = resolveNextStep(body);
                if (next.screen !== 'MainTabs') {
                    await handleSocialLoginSuccess(body);
                    return;
                }
            }
            if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
            if (error?.code === statusCodes.IN_PROGRESS) {
                Alert.alert('Please wait', 'Sign in already in progress.');
                return;
            }
            if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available.');
                return;
            }
            const msg = error?.response?.data?.message || error?.message || 'Google login failed';
            Alert.alert('Google Sign-In Failed', msg);
        } finally {
            setGoogleLoading(false);
        }
    };

    // ─── Apple Sign-In ──────────────────────────────────────────────────────
    const handleAppleSignIn = async () => {
        try {
            setAppleLoading(true);
            if (Platform.OS !== 'ios') {
                Alert.alert('Apple Sign-In', 'Apple Sign-In is available on iOS only.');
                return;
            }
            const available = await AppleAuthentication.isAvailableAsync();
            if (!available) {
                Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device.');
                return;
            }
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            const identityToken = credential.identityToken;
            if (!identityToken) {
                Alert.alert('Apple Sign-In', 'identityToken not found. Please try again.');
                return;
            }

            // Send to backend
            const res = await axios.post(
                `${API_BASE_URL}account/apple/`,
                { id_token: identityToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            await handleSocialLoginSuccess(res.data);
        } catch (e: any) {
            if (e?.code === 'ERR_REQUEST_CANCELED') return;
            const msg = e?.response?.data?.message || e?.message || 'Apple login failed';
            Alert.alert('Apple Sign-In Error', msg);
        } finally {
            setAppleLoading(false);
        }
    };

    const handleSignInEmail = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Missing info', 'Please enter email and password.');
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}${END_POINTS}`,
                { email: email.trim().toLowerCase(), password },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            const data = res.data;
            if (data?.success === true) {
                // Stores BOTH the access and refresh tokens. Previously only the
                // access token was kept here, so email/password users had no
                // refresh token and the session died (~30 min) with "no products
                // found" until they logged out and back in.
                await storeAuthPayload(data);
                if (rememberMe) {
                    await AsyncStorage.setItem('rememberedEmail', email.trim().toLowerCase());
                }
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.navigate('MainTabs', { email: email.trim().toLowerCase() } as any);
                }, 1500);
            } else {
                Alert.alert('Sign in failed', data?.message || 'Invalid credentials');
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong';
            if (msg === 'Profile setup not completed. Please complete your profile first!') {
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.navigate('ProfileSetup', { email: email.trim().toLowerCase() } as any);
                }, 1500);
            }
            if (msg === 'Account not activated. Please verify OTP first!') {
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.navigate('OtpAuth', { email: email.trim().toLowerCase() } as any);
                }, 1500);
            }
            Alert.alert('Sign in failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
            <KeyboardAvoider style={{ flex: 1 }}>
                <View style={styles.page}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                        bounces={false}
                    >
                        <View style={styles.logoContainer}>
                            <Image source={Images.Logo} style={styles.logoImage} resizeMode="contain" />
                        </View>

                        <Text style={[styles.title, { textAlign: 'center' }]}>Welcome to DealNux!</Text>
                        <Text style={[styles.subTitle, { textAlign: 'center' }]}>Sign in to track prices and save money.</Text>

                        <Text style={styles.label}>Email address</Text>
                        <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}>
                            <MaterialIcons
                                name="email"
                                size={20}
                                color={focusedField === 'email' ? AUTH.primary : AUTH.faint}
                                style={styles.iconMr}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your email"
                                placeholderTextColor={AUTH.placeholder}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <Text style={styles.label}>Password</Text>
                        <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}>
                            <Entypo
                                name="lock"
                                size={20}
                                color={focusedField === 'password' ? AUTH.primary : AUTH.faint}
                                style={styles.iconMr}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your password"
                                placeholderTextColor={AUTH.placeholder}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={20}
                                    color={AUTH.faint}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={() => handleRememberMeChange(!rememberMe)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkboxSquare, rememberMe && styles.checkboxSquareChecked]}>
                                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.rememberMeText}>Remember Me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} activeOpacity={0.8}>
                                <Text style={styles.forgotPassword}>Forgot Password</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.mainButton, loading && { opacity: 0.7 }]}
                            onPress={handleSignInEmail}
                            disabled={loading}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.mainButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.orText}>Or Login With</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.socialRow}>
                            {/* Google Button - Android only */}
                            {isAndroid && (
                                <TouchableOpacity
                                    style={[styles.socialBtn, googleLoading && styles.socialBtnDisabled]}
                                    onPress={handleGoogleSignIn}
                                    disabled={googleLoading}
                                    activeOpacity={0.8}
                                >
                                    {googleLoading ? (
                                        <ActivityIndicator size="small" color={AUTH.primary} />
                                    ) : (
                                        <GoogleButtonSvg />
                                    )}
                                </TouchableOpacity>
                            )}

                            {/* Apple Button — iOS only */}
                            {isIOS && (
                                <TouchableOpacity
                                    style={[styles.socialBtn, appleLoading && styles.socialBtnDisabled]}
                                    onPress={handleAppleSignIn}
                                    disabled={appleLoading}
                                    activeOpacity={0.8}
                                >
                                    {appleLoading ? (
                                        <ActivityIndicator size="small" color={AUTH.primary} />
                                    ) : (
                                        <AppleButtonSvg />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.signupRow}>
                            <Text style={styles.signupText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.8}>
                                <Text style={styles.signupLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoider>

            <SuccessModal
                visible={showSuccessModal}
                title="Successful!"
                description="You have signed in successfully."
                onClose={() => setShowSuccessModal(false)}
            />
        </SafeAreaView>
    );
};

export default SignIn;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    page: {
        flex: 1,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 40,
        // Centres the form in whatever space is left under the logo. Content
        // taller than the screen still scrolls normally.
        flexGrow: 1,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        // Clear of the status bar above, with a light gap to the heading below.
        paddingTop: 24,
        paddingBottom: 12,
    },
    logoImage: {
        width: width * 0.62,
        height: (width * 0.62) / LOGO_ASPECT,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: AUTH.heading,
        letterSpacing: -0.4,
    },
    subTitle: {
        fontSize: 15,
        color: AUTH.muted,
        lineHeight: 22,
        marginVertical: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: AUTH.body,
        marginBottom: 8,
        marginTop: 16,
    },
    // White fields read as cards on the off-white page; the old grey-on-grey
    // fill made them look disabled.
    inputRow: {
        backgroundColor: AUTH.surface,
        borderRadius: AUTH.radius,
        borderWidth: 1,
        borderColor: AUTH.border,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputRowFocused: {
        borderColor: AUTH.borderFocus,
        ...AUTH_INPUT_FOCUS_SHADOW,
    },
    iconMr: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
        color: AUTH.heading,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberMeText: {
        fontSize: 14,
        color: AUTH.body,
    },
    forgotPassword: {
        fontSize: 14,
        fontWeight: '600',
        color: AUTH.primary,
    },
    mainButton: {
        backgroundColor: AUTH.primary,
        borderRadius: AUTH.radius,
        paddingVertical: 18,
        alignItems: 'center',
        ...AUTH_BUTTON_SHADOW,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: AUTH.divider,
    },
    orText: {
        fontSize: 13,
        color: AUTH.faint,
        marginHorizontal: 16,
    },
    checkboxSquare: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: AUTH.surface,
    },
    checkboxSquareChecked: {
        backgroundColor: AUTH.primary,
        borderColor: AUTH.primary,
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialBtn: {
        flex: 1,
        backgroundColor: AUTH.surface,
        borderWidth: 1,
        borderColor: AUTH.border,
        borderRadius: AUTH.radius,
        paddingHorizontal: 24,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialBtnDisabled: {
        opacity: 0.6,
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 20,
        marginBottom: 16,
    },
    signupText: {
        fontSize: 15,
        color: AUTH.muted,
    },
    signupLink: {
        fontSize: 15,
        color: AUTH.primary,
        fontWeight: '700',
    },
});