import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, IPA_BASE, REGISTER } from '@env';
import { Entypo, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
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
} from 'react-native';
import KeyboardAvoider from '../../components/KeyboardAvoider';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppleButtonSvg from '../../components/Apple';
import GoogleButtonSvg from '../../components/Google';
import { Images } from '../../constants';
import { LOGO_ASPECT } from '../../constants/layout';
import { AUTH, AUTH_BUTTON_SHADOW, AUTH_INPUT_FOCUS_SHADOW } from '../../constants/authTheme';
import { AuthStackParamList } from '../../Navigation/types';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { storeAuthPayload } from '../../utils/socialAuthFlow';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = IPA_BASE;
const END_POINTS = REGISTER;

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

const SignUp = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Which field is focused, so its border and icon can highlight.
    const [focusedField, setFocusedField] = useState<
        'name' | 'email' | 'password' | 'confirmPassword' | null
    >(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);

    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

    // ─── Google Sign-In Setup ───────────────────────────────────────────────
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iosClientId: GOOGLE_IOS_CLIENT_ID,
            offlineAccess: false,
        });
    }, []);

    const validate = () => {
        if (!name.trim()) return 'Name required';
        if (!email.trim()) return 'Email required';
        if (!password) return 'Password required';
        if (password.length < 6) return 'Password must be at least 6 characters';
        if (!confirmPassword) return 'Please confirm your password';
        if (password !== confirmPassword) return 'Passwords do not match';
        if (!agreedToTerms) return 'Please agree to the Terms & Conditions';
        if (!agreedToPrivacy) return 'Please agree to the Privacy Policy';
        return null;
    };

    const handleSignUp = async () => {
        const err = validate();
        if (err) {
            Alert.alert('Error', err);
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}${END_POINTS}`,
                {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    agreed_to_terms: "true",
                    agreed_to_privacy: "true",
                },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            const data = res.data;
            Alert.alert('Success', data?.message ?? 'Account created');
            navigation.navigate('OtpAuth', { email: email.trim().toLowerCase() } as any);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong';
            Alert.alert('Sign up failed', msg);
        } finally {
            setLoading(false);
        }
    };

    // ─── Route a social sign up ──────────────────────────────────────────────
    //     Google/Apple have already verified the email, so there is no OTP step
    //     here. A social sign up always continues to ProfileSetup.
    const routeAfterSocialAuth = async (data: any, socialEmail?: string) => {
        await storeAuthPayload(data);

        const email = socialEmail ?? data?.data?.user?.email ?? data?.user?.email;
        console.log('➡️ social sign up -> ProfileSetup', { email });

        navigation.navigate('ProfileSetup', { email } as any);
    };

    // ─── Handle Google backend call ─────────────────────────────────────────
    const handleGoogleBackendLogin = async (accessToken: string, socialEmail?: string) => {
        try {
            const res = await axios.post(
                `${API_BASE_URL}account/google/`,
                { access_token: accessToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            console.log('data ', res.data);
            await routeAfterSocialAuth(res.data, socialEmail);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Google sign up failed';
            Alert.alert('Google Sign Up Failed', msg);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            setGoogleLoading(true);
            await GoogleSignin.hasPlayServices();

            const signInResult: any = await GoogleSignin.signIn();
            // v13+ returns { type, data: { user } }; older versions return { user }.
            const socialEmail: string | undefined =
                signInResult?.data?.user?.email ?? signInResult?.user?.email;

            const tokens = await GoogleSignin.getTokens();

            if (tokens?.accessToken) {
                await handleGoogleBackendLogin(tokens.accessToken, socialEmail);
            } else {
                Alert.alert('Error', 'Could not get Google access token.');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User canceled — no need to show an error
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Alert.alert('Please wait', 'Sign in already in progress.');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available.');
            } else {
                Alert.alert('Google Sign Up Failed', error?.message || 'Something went wrong.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    // ─── Handle Apple Sign In ────────────────────────────────────────────────
    const handleAppleSignUp = async () => {
        if (Platform.OS !== 'ios') {
            Alert.alert('Not Available', 'Apple Sign In is only available on iOS.');
            return;
        }
        try {
            setAppleLoading(true);

            const isAvailable = await AppleAuthentication.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Not Available', 'Apple Sign In is not available on this device.');
                return;
            }

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                Alert.alert('Error', 'Could not get Apple identity token.');
                return;
            }

            const res = await axios.post(
                `${API_BASE_URL}account/apple/`,
                { id_token: credential.identityToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            console.log('apple data ', res.data);
            await routeAfterSocialAuth(res.data, credential.email || undefined);
        } catch (e: any) {
            if (e?.code === 'ERR_REQUEST_CANCELED') {
                return;
            }
            const msg = e?.response?.data?.message || e?.message || 'Apple sign up failed';
            Alert.alert('Apple Sign Up Failed', msg);
        } finally {
            setAppleLoading(false);
        }
    };

    const openTerms = () => {
        navigation.navigate('TermsOfService' as any);
    };

    const openPrivacy = () => {
        navigation.navigate('PrivacyPolicy' as any);
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

                        <Text style={styles.title}>Sign up</Text>
                        <Text style={styles.subTitle}>Welcome, let's get you signed up.</Text>

                        <Text style={styles.label}>Full Name</Text>
                        <View style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused]}>
                            <FontAwesome
                                name="user"
                                size={20}
                                color={focusedField === 'name' ? AUTH.primary : AUTH.faint}
                                style={styles.iconMr}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your full name"
                                placeholderTextColor={AUTH.placeholder}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

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
                                placeholder="Create a password"
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

                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={[styles.inputRow, focusedField === 'confirmPassword' && styles.inputRowFocused]}>
                            <Entypo
                                name="lock"
                                size={20}
                                color={focusedField === 'confirmPassword' ? AUTH.primary : AUTH.faint}
                                style={styles.iconMr}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Re-enter your password"
                                placeholderTextColor={AUTH.placeholder}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedField('confirmPassword')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
                                <Ionicons
                                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={20}
                                    color={AUTH.faint}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Checked here so a typo is caught before the request goes out. */}
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <Text style={styles.fieldError}>Passwords do not match</Text>
                        )}

                        {/* ─── Terms & Conditions ────────────────────────────────── */}
                        <View style={styles.termsContainer}>
                            <TouchableOpacity
                                style={styles.termsRow}
                                onPress={() => setAgreedToTerms(!agreedToTerms)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                                    {agreedToTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.termsText}>
                                    I agree to the{' '}
                                    <Text style={styles.termsLink} onPress={openTerms}>
                                        Terms & Conditions
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.termsRow}
                                onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                                    {agreedToPrivacy && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.termsText}>
                                    I agree to the{' '}
                                    <Text style={styles.termsLink} onPress={openPrivacy}>
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.mainButton, { opacity: loading ? 0.7 : 1 }]}
                            disabled={loading}
                            onPress={handleSignUp}
                            activeOpacity={0.9}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.mainButtonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.orText}>Or Sign Up With</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.socialRow}>
                            {/* Google Button — Android only */}
                            {isAndroid && (
                                <TouchableOpacity
                                    style={styles.socialBtn}
                                    activeOpacity={0.8}
                                    onPress={handleGoogleSignUp}
                                    disabled={googleLoading}
                                >
                                    {googleLoading ? <ActivityIndicator color={AUTH.primary} /> : <GoogleButtonSvg />}
                                </TouchableOpacity>
                            )}

                            {/* Apple Button — iOS only */}
                            {isIOS && (
                                <TouchableOpacity
                                    style={styles.socialBtn}
                                    activeOpacity={0.8}
                                    onPress={handleAppleSignUp}
                                    disabled={appleLoading}
                                >
                                    {appleLoading ? <ActivityIndicator color="#000" /> : <AppleButtonSvg />}
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.bottomRow}>
                            <Text style={styles.bottomText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.8}>
                                <Text style={styles.bottomLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoider>
        </SafeAreaView>
    );
};

export default SignUp;

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
        textAlign: 'center',
    },
    subTitle: {
        fontSize: 15,
        color: AUTH.muted,
        lineHeight: 22,
        marginVertical: 8,
        textAlign: 'center',
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
    mainButton: {
        backgroundColor: AUTH.primary,
        borderRadius: AUTH.radius,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
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
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 20,
        marginBottom: 16,
    },
    bottomText: {
        fontSize: 15,
        color: AUTH.muted,
    },
    bottomLink: {
        fontSize: 15,
        color: AUTH.primary,
        fontWeight: '700',
    },

    // ─── Terms & Conditions Styles ──────────────────────────────────────────
    termsContainer: {
        marginTop: 16,
        gap: 10,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AUTH.surface,
    },
    checkboxChecked: {
        backgroundColor: AUTH.primary,
        borderColor: AUTH.primary,
    },
    termsText: {
        fontSize: 14,
        color: AUTH.body,
        flex: 1,
        flexWrap: 'wrap',
    },
    fieldError: {
        marginTop: 6,
        fontSize: 13,
        color: '#DC2626',
    },
    termsLink: {
        color: AUTH.primary,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});