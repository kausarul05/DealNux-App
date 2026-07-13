import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, IPA_BASE, REGISTER } from '@env';
import { Entypo, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
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
import AppleButtonSvg from '../../components/Apple';
import GoogleButtonSvg from '../../components/Google';
import { Images } from '../../constants';
import { AuthStackParamList } from '../../Navigation/types';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const API_BASE_URL = IPA_BASE;
const END_POINTS = REGISTER;

const SignUp = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);

    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

    // ─── Google Auth Setup ──────────────────────────────────────────────────
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                handleGoogleBackendLogin(authentication.accessToken);
            }
        } else if (response?.type === 'error') {
            Alert.alert('Google Sign Up Failed', 'Something went wrong with Google authentication.');
        }
    }, [response]);

    const validate = () => {
        if (!name.trim()) return 'Name required';
        if (!email.trim()) return 'Email required';
        if (!password) return 'Password required';
        if (password.length < 6) return 'Password must be at least 6 characters';
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

    // ─── Handle Google backend call ─────────────────────────────────────────
    const handleGoogleBackendLogin = async (accessToken: string) => {
        try {
            setGoogleLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}account/google-login/`,
                { access_token: accessToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            const data = res.data;

            // ✅ Save token if backend returns one
            if (data?.token || data?.access) {
                await AsyncStorage.setItem('vToken', data.token || data.access);
            }

            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Google sign up failed';
            Alert.alert('Google Sign Up Failed', msg);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!request) {
            Alert.alert('Error', 'Google sign in is not ready yet, please try again.');
            return;
        }
        await promptAsync();
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
                `${API_BASE_URL}account/apple-login/`,
                { id_token: credential.identityToken },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );

            const data = res.data;

            if (data?.token || data?.access) {
                await AsyncStorage.setItem('vToken', data.token || data.access);
            }

            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
        } catch (e: any) {
            if (e?.code === 'ERR_REQUEST_CANCELED') {
                // User canceled the Apple sign-in flow — no need to show an error
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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.page}>
                    <View style={styles.logoContainer}>
                        <Image source={Images.Logo} style={styles.logoImage} resizeMode="contain" />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                        bounces={false}
                    >
                        <Text style={styles.title}>Sign up</Text>
                        <Text style={styles.subTitle}>Welcome, let's get you signed up.</Text>

                        <Text style={styles.label}>Full Name</Text>
                        <View style={[styles.inputRow, styles.inputBorder]}>
                            <FontAwesome name="user" size={24} color="#334155" style={styles.iconMr} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Your Name ex: Ahmed ReFat"
                                placeholderTextColor="#A0A0A0"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </View>

                        <Text style={styles.label}>Email address</Text>
                        <View style={[styles.inputRow, styles.inputBorder]}>
                            <MaterialIcons name="email" size={24} color="#334155" style={styles.iconMr} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Your email ex: yourmail@gmail.com"
                                placeholderTextColor="#A0A0A0"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <Text style={styles.label}>Password</Text>
                        <View style={[styles.inputRow, styles.inputBorder]}>
                            <Entypo name="lock" size={24} color="#334155" style={styles.iconMr} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="****************"
                                placeholderTextColor="#A0A0A0"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                                {showPassword ? (
                                    <Ionicons name="eye-outline" size={24} color="black" />
                                ) : (
                                    <Ionicons name="eye-off-outline" size={24} color="black" />
                                )}
                            </TouchableOpacity>
                        </View>

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
                            <TouchableOpacity
                                style={styles.socialBtn}
                                activeOpacity={0.8}
                                onPress={handleGoogleSignUp}
                                disabled={googleLoading || !request}
                            >
                                {googleLoading ? <ActivityIndicator color="#2355B6" /> : <GoogleButtonSvg />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.socialBtn}
                                activeOpacity={0.8}
                                onPress={handleAppleSignUp}
                                disabled={appleLoading}
                            >
                                {appleLoading ? <ActivityIndicator color="#000" /> : <AppleButtonSvg />}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bottomRow}>
                            <Text style={styles.bottomText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.8}>
                                <Text style={styles.bottomLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
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
        flexGrow: 1,
    },
    logoContainer: {
        alignItems: 'center',
        paddingTop: height * 0.02,
    },
    logoImage: {
        width: width * 0.6,
        height: height * 0.15,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#111827',
    },
    subTitle: {
        fontSize: 18,
        color: '#636F85',
        marginVertical: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#636F85',
        marginBottom: 8,
        marginTop: 16,
    },
    inputRow: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputBorder: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    iconMr: {
        marginRight: 16,
    },
    textInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
        color: '#111827',
    },
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    orText: {
        fontSize: 16,
        color: '#666666',
        marginHorizontal: 16,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
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
        fontSize: 18,
        color: '#111827',
    },
    bottomLink: {
        fontSize: 18,
        color: 'red',
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
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkboxChecked: {
        backgroundColor: '#2355B6',
        borderColor: '#2355B6',
    },
    termsText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
        flexWrap: 'wrap',
    },
    termsLink: {
        color: '#2355B6',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});