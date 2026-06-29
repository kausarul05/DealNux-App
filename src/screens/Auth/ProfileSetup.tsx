import { IPA_BASE, PROFILE_SETUP } from '@env';
import { Fontisto, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { AuthStackParamList } from '../../Navigation/types';

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const API_BASE_URL = IPA_BASE;
const END_POINTS = PROFILE_SETUP;

interface RouteParams {
    email?: string;
}

const ProfileSetup = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();
    const route = useRoute();
    const params = route.params as RouteParams;

    const [interestsItem, setInterestsItem] = useState<string[]>([]);
    const [image, setImage] = useState<any>(null);
    const [referCode, setReFerCode] = useState<string>('');

    // ─── Shipping Address Fields ──────────────────────────────────────────────
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [country, setCountry] = useState('United States');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggle = (item: string) => {
        setInterestsItem((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission required', 'Permission to access the media library is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled) return;
        setImage(result);
    };

    const selectedImageUri = image?.assets?.[0]?.uri;

    const handleSubmit = async () => {
        // ─── Validations ──────────────────────────────────────────────────────
        if (!firstName.trim()) {
            Alert.alert('Error', 'Please enter your first name.');
            return;
        }
        if (!lastName.trim()) {
            Alert.alert('Error', 'Please enter your last name.');
            return;
        }
        if (!addressLine1.trim()) {
            Alert.alert('Error', 'Please enter your address.');
            return;
        }
        if (!city.trim()) {
            Alert.alert('Error', 'Please enter your city.');
            return;
        }
        if (!state.trim()) {
            Alert.alert('Error', 'Please enter your state.');
            return;
        }
        if (!zipCode.trim()) {
            Alert.alert('Error', 'Please enter your zip code.');
            return;
        }
        if (!country.trim()) {
            Alert.alert('Error', 'Please enter your country.');
            return;
        }

        const selectedImage = image?.assets?.[0];
        const formData = new FormData();
        formData.append('email', params.email || '');
        formData.append('first_name', firstName.trim());
        formData.append('last_name', lastName.trim());
        formData.append('address', addressLine1.trim());
        formData.append('address_2', addressLine2.trim());
        formData.append('city', city.trim());
        formData.append('state', state.trim());
        formData.append('zip_code', zipCode.trim());
        formData.append('country', country.trim());
        formData.append('interests', JSON.stringify(interestsItem));
        formData.append('referred_by_code', referCode.trim());

        if (selectedImage) {
            formData.append(
                'profile_picture',
                {
                    uri: selectedImage.uri,
                    type: selectedImage.mimeType || 'image/jpeg',
                    name: selectedImage.fileName || 'profile.jpg',
                } as any,
            );
        }

        try {
            setLoading(true);
            const res = await axios.post(`${API_BASE_URL}${END_POINTS}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 15000,
            });

            const data = res.data;
            if (data?.success === true) {
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    (navigation as any).navigate('SignIn' as any);
                }, 2000);
            } else {
                Alert.alert('Profile Set', data?.message || 'Invalid Information');
            }
        } catch (e: any) {
            Alert.alert('Profile Set Failed', e?.response?.data?.message || e?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const interests = [
        'Grocery', 'Electronics', 'Pets', 'Home', 'Beauty', 'Fashion', 'Automotive',
        'Sports', 'Books', 'Toys', 'Health', 'Garden', 'Others'
    ];

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View style={styles.page}>
                    <View style={styles.headerRow}>
                        <AppHeader left={() => <BackButton />} />
                        <Text style={styles.headerTitle}>Profile Update</Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                    >
                        <Text style={styles.h1}>Let's get to know you</Text>
                        <Text style={styles.h2}>Customize your feed to see the best deals near you,</Text>

                        {/* Avatar */}
                        <View style={styles.avatarWrap}>
                            <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={styles.avatarTouch}>
                                {selectedImageUri ? (
                                    <Image source={{ uri: selectedImageUri }} style={styles.avatarImg} />
                                ) : (
                                    <MaterialCommunityIcons name="account-circle" size={120} color="#E3E3E9" />
                                )}

                                <View style={styles.addIconWrap}>
                                    <MaterialIcons name="add-circle" size={26} color="#2355B6" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.uploadText}>Upload Photo</Text>

                        {/* ─── Shipping Address ────────────────────────────────── */}
                        <Text style={styles.sectionTitle}>SHIPPING ADDRESS *</Text>

                        <View style={styles.row}>
                            <View style={[styles.halfInput, styles.mr2]}>
                                <Text style={styles.label}>FIRST NAME *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="John"
                                        placeholderTextColor="#9CA3AF"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>LAST NAME *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Doe"
                                        placeholderTextColor="#9CA3AF"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.label}>ADDRESS LINE 1 *</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="location-sharp" size={24} color="#111827" style={styles.iconMr} />
                            <TextInput
                                style={styles.textInput}
                                value={addressLine1}
                                onChangeText={setAddressLine1}
                                placeholder="123 Main St"
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                            />
                        </View>

                        <Text style={styles.label}>ADDRESS LINE 2 (APT/SUITE) (optional)</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="location-sharp" size={24} color="#111827" style={styles.iconMr} />
                            <TextInput
                                style={styles.textInput}
                                value={addressLine2}
                                onChangeText={setAddressLine2}
                                placeholder="Apt 4B"
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.halfInput, styles.mr2]}>
                                <Text style={styles.label}>CITY *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="Chicago"
                                        placeholderTextColor="#9CA3AF"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>STATE *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={state}
                                        onChangeText={setState}
                                        placeholder="IL"
                                        placeholderTextColor="#9CA3AF"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.halfInput, styles.mr2]}>
                                <Text style={styles.label}>ZIP CODE *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={zipCode}
                                        onChangeText={setZipCode}
                                        placeholder="60601"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>COUNTRY *</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={country}
                                        onChangeText={setCountry}
                                        placeholder="United States"
                                        placeholderTextColor="#9CA3AF"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* ─── Referral Code ───────────────────────────────────── */}
                        <Text style={styles.label}>REFERRAL CODE (OPTIONAL)</Text>
                        <View style={styles.inputRow}>
                            <MaterialCommunityIcons name="account" size={24} color="#111827" style={styles.iconMr} />
                            <TextInput
                                value={referCode}
                                onChangeText={setReFerCode}
                                style={styles.textInput}
                                placeholder="Enter code"
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* ─── Interests ────────────────────────────────────────── */}
                        <Text style={styles.interestsTitle}>INTERESTS</Text>

                        <View style={styles.chipsWrap}>
                            {interests.map((item) => {
                                const active = interestsItem.includes(item);
                                return (
                                    <TouchableOpacity
                                        key={item}
                                        onPress={() => toggle(item)}
                                        activeOpacity={0.85}
                                        style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ─── Submit Button ────────────────────────────────────── */}
                        <TouchableOpacity
                            style={[styles.mainButton, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            activeOpacity={0.9}
                            disabled={loading}
                        >
                            <View style={styles.btnRow}>
                                <Text style={styles.mainButtonText}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
                                <Fontisto name="arrow-right-l" size={22} color="white" />
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <SuccessModal
                    visible={showSuccessModal}
                    title="Successful!"
                    description="Your profile has been set up successfully."
                    onClose={() => setShowSuccessModal(false)}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ProfileSetup;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9F9FB' },
    page: { flex: 1, paddingHorizontal: 20 },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
    },
    headerTitle: { fontSize: 18, color: '#111827', fontWeight: '600' },

    scrollContent: { paddingBottom: 40 },

    h1: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 12 },
    h2: { fontSize: 18, color: '#111827', marginTop: 8 },

    avatarWrap: { alignItems: 'center', marginTop: 14 },
    avatarTouch: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 120, height: 120, borderRadius: 60 },

    addIconWrap: {
        position: 'absolute',
        right: 0,
        bottom: 6,
        backgroundColor: '#fff',
        borderRadius: 999,
        padding: 2,
    },

    uploadText: { color: '#2355B6', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 6 },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#636F85',
        marginTop: 20,
        marginBottom: 12,
        letterSpacing: 0.5,
    },

    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#636F85',
        marginTop: 12,
        marginBottom: 6,
        letterSpacing: 0.3,
    },

    inputRow: {
        borderWidth: 1,
        borderColor: '#D1D6DB',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        backgroundColor: '#FFFFFF',
    },
    iconMr: { marginRight: 10 },
    textInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
        color: '#111827',
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        flex: 1,
    },
    mr2: {
        marginRight: 10,
    },

    interestsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginTop: 20,
        marginBottom: 8,
        letterSpacing: 0.3,
    },

    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    chip: { borderWidth: 2, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
    chipInactive: { borderColor: '#D1D6DB', backgroundColor: '#fff' },
    chipActive: { borderColor: '#2355B6', backgroundColor: '#EEF4FF' },
    chipText: { fontSize: 16, color: '#111827' },
    chipTextActive: { color: '#2355B6', fontWeight: '700' },

    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 24,
    },
    btnRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
    mainButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});