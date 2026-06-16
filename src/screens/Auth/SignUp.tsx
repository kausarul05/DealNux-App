import { IPA_BASE, REGISTER } from '@env';
import { Entypo, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
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

    const validate = () => {
        if (!name.trim()) return 'Name required';
        if (!email.trim()) return 'Email required';
        if (!password) return 'Password required';
        if (password.length < 6) return 'Password must be at least 6 characters';
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

    return (
        // ✅ FIX 1: 'bottom' edge added
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
            {/* ✅ FIX 2: 'height' for Android, 'padding' for iOS */}
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
                            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                                <GoogleButtonSvg />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                                <AppleButtonSvg />
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
        height: height * 0.15, // ✅ slightly reduced for more form space
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
});