import { IPA_BASE, RESET_PASSWORD } from '@env';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import React, { useMemo, useState } from 'react';
import {
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
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { Images } from '../../constants';
import { AuthStackParamList } from '../../Navigation/types';

const { width, height } = Dimensions.get('window');

interface RouteParams {
    email?: string;
}

const API_BASE_URL = IPA_BASE;
const END_POINTS = RESET_PASSWORD;

const CreateNewPassword = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const route = useRoute();
    const params = route.params as RouteParams;

    const email = params?.email?.trim()?.toLowerCase();

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const passwordRules = useMemo(() => ({
        minLen: 8,
        strongRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    }), []);

    const validate = () => {
        if (!email) {
            Alert.alert('Error', 'Email missing. Please go back and try again.');
            return false;
        }
        const p = password.trim();
        const c = confirmPassword.trim();
        if (!p) { Alert.alert('Validation', 'Please enter a new password.'); return false; }
        if (p.length < passwordRules.minLen) {
            Alert.alert('Validation', `Password must be at least ${passwordRules.minLen} characters.`);
            return false;
        }
        if (!passwordRules.strongRegex.test(p)) {
            Alert.alert('Validation', 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number.');
            return false;
        }
        if (!c) { Alert.alert('Validation', 'Please confirm your new password.'); return false; }
        if (p !== c) { Alert.alert('Validation', 'Password and Confirm Password do not match.'); return false; }
        if (p.toLowerCase() === 'password123' || p === '12345678') {
            Alert.alert('Validation', 'Please choose a more unique password.');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}${END_POINTS}`,
                { email, password: password.trim(), confirm_password: confirmPassword.trim() },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            const data = res.data;
            if (data?.success === true) {
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
                }, 1500);
            } else {
                const msg = data?.message || 'Password reset failed';
                const lower = String(msg).toLowerCase();
                if (lower.includes('previous') || lower.includes('old password') || lower.includes('same')) {
                    Alert.alert('Validation', 'New password must be different from the previous password.');
                } else {
                    Alert.alert('Reset Password Failed', msg);
                }
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong';
            const lower = String(msg).toLowerCase();
            if (lower.includes('previous') || lower.includes('old password') || lower.includes('same')) {
                Alert.alert('Validation', 'New password must be different from the previous password.');
            } else {
                Alert.alert('Reset Password Failed', msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        // ✅ FIX 1: Added 'bottom' edge
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
            {/* ✅ FIX 2: KeyboardAvoidingView wraps everything */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* ✅ FIX 3: ScrollView so inputs scroll above keyboard */}
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

                        <View style={styles.formContainer}>
                            <Text style={styles.heading}>Create New Password</Text>
                            <Text style={styles.subHeading}>
                                Your password must be different from{'\n'}previous used password.
                            </Text>

                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordContainer}>
                                <Entypo name="lock" size={24} color="#334155" />
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="********"
                                    placeholderTextColor="#A0A0A0"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <Ionicons name="eye-outline" size={24} color="black" />
                                    ) : (
                                        <Ionicons name="eye-off-outline" size={24} color="black" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordContainer}>
                                <Entypo name="lock" size={24} color="#334155" />
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="********"
                                    placeholderTextColor="#A0A0A0"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <Ionicons name="eye-outline" size={24} color="black" />
                                    ) : (
                                        <Ionicons name="eye-off-outline" size={24} color="black" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* ✅ FIX 4: Removed marginTop:160 — button flows naturally */}
                            <TouchableOpacity
                                style={[styles.mainButton, loading && { opacity: 0.7 }]}
                                activeOpacity={0.9}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                <Text style={styles.mainButtonText}>
                                    {loading ? 'Please wait...' : 'Continue'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <SuccessModal
                visible={showSuccessModal}
                title="Successful!"
                description="Your password was changed successfully."
                onClose={() => setShowSuccessModal(false)}
            />
        </SafeAreaView>
    );
};

export default CreateNewPassword;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F9F9FB',
    },
    page: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    logoContainer: {
        alignItems: 'center',
        paddingTop: 8,
    },
    logoImage: {
        width: width * 0.4,
        height: height * 0.1,
    },
    formContainer: {
        flex: 1,
        marginTop: 10,
    },
    heading: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        color: '#111827',
    },
    subHeading: {
        fontSize: 18,
        textAlign: 'center',
        color: '#636F85',
        marginVertical: 12,
        lineHeight: 26,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#636F85',
        marginBottom: 8,
        marginTop: 24,
    },
    passwordContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        color: '#636F85',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
    },
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 32, // ✅ replaced hardcoded 160 with sensible spacing
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});