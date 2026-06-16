import { FORGOT_PASSWORD, IPA_BASE } from '@env';
import { FontAwesome } from '@expo/vector-icons';
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
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Images } from '../../constants';
import { AuthStackParamList } from '../../Navigation/types';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = IPA_BASE;
const END_POINTS = FORGOT_PASSWORD;

const ResetPassword = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Missing info', 'Please enter email.');
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}${END_POINTS}`,
                { email: email.trim().toLowerCase() },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            const data = res.data;
            if (data?.success === true) {
                navigation.navigate('OtpResetPassword', { email: email.trim().toLowerCase() } as never);
            } else {
                Alert.alert('Reset Password Failed', data?.message || 'Something went wrong');
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Something went wrong';
            Alert.alert('Reset Password Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        // ✅ FIX 1: Added 'bottom' edge
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
            {/* ✅ FIX 2: Wrap with KeyboardAvoidingView */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* ✅ FIX 3: ScrollView so button stays visible above keyboard */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.screen}>
                        <AppHeader left={() => <BackButton />} />

                        <View style={styles.logoWrapper}>
                            <Image source={Images.Logo} style={styles.logo} resizeMode="contain" />
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.title}>Reset Password</Text>
                            <Text style={styles.subtitle}>
                                Enter your email, we will send a verification{'\n'}
                                code to your email.
                            </Text>

                            <View style={styles.formArea}>
                                <Text style={styles.label}>Email address</Text>
                                <View style={styles.inputWrapper}>
                                    <FontAwesome name="envelope" size={26} color="#475569" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="demo@gmail.com"
                                        placeholderTextColor="#64748B"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={handleResetPassword}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* ✅ FIX 4: Button is now in normal flow, NOT position:absolute */}
                        <View style={styles.bottomButtonArea}>
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                activeOpacity={0.85}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Continue</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ResetPassword;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    screen: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24, // ✅ replaces absolute bottom positioning
        backgroundColor: '#F5F5F7',
    },
    logoWrapper: {
        alignItems: 'center',
        marginTop: 10,
    },
    logo: {
        width: width * 0.34,
        height: 150,
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2F2F33',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 17,
        lineHeight: 28,
        color: '#667085',
        textAlign: 'center',
        marginTop: 24,
    },
    formArea: {
        width: '100%',
        marginTop: 58,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: '#667085',
        marginBottom: 14,
    },
    inputWrapper: {
        borderWidth: 1.5,
        borderColor: '#D0D5DD',
        borderRadius: 16,
        backgroundColor: '#F5F5F7',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    input: {
        flex: 1,
        marginLeft: 16,
        fontSize: 18,
        color: '#64748B',
    },
    // ✅ FIX: Normal flow bottom area, no position:absolute
    bottomButtonArea: {
        paddingTop: 24,
        paddingBottom: 8,
    },
    button: {
        backgroundColor: '#2D5BBA',
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});