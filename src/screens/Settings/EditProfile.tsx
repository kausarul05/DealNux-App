import { IPA_BASE, PROFILE, PROFILE_UPDATE } from "@env";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import { Toast, useToast } from "../../components/useToost";
import { Images } from "../../constants";
import { AuthStackParamList } from "../../Navigation/types";

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

type UserProfile = {
    name: string;
    email: string;
    profile_picture: string;
    address: string;
    address_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    first_name?: string;
    last_name?: string;
    interests: string[];
    refaradal_code: string;
    balance: number;
    has_claimed_referral: boolean;
    referred_by: string | null;
};

const API_BASE_URL = IPA_BASE;
const END_POINTS_GET = PROFILE;
const END_POINTS_PATCH = PROFILE_UPDATE;

const EditProfile = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();

    const [user, setUser] = useState<UserProfile | null>(null);

    // picked image result from ImagePicker
    const [image, setImage] = useState<ImagePicker.ImagePickerResult | null>(
        null
    );
    const toast = useToast()
    
    // ─── Form Fields ──────────────────────────────────────────────────────────
    const [name, setName] = useState<string>("");
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [address2, setAddress2] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [state, setState] = useState<string>("");
    const [zipCode, setZipCode] = useState<string>("");
    const [country, setCountry] = useState<string>("");
    const [interestsItem, setInterestsItem] = useState<string[]>([]);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [spinnerRotation, setSpinnerRotation] = useState(0);

    const interests = useMemo(
        () => ["Grocery", "Electronics", "Pets", "Home", "Beauty", "Fashion", "Automotive", "Sports", "Books", "Toys", "Health", "Garden", "Others"],
        []
    );

    const safeParseInterests = (rawArr?: string[]) => {
        if (!rawArr || rawArr.length === 0) return [];
        const first = rawArr[0];

        if (typeof first === "string" && first.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(first);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return rawArr;
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const token = await AsyncStorage.getItem("vToken");

            try {
                const res = await axios.get(`${API_BASE_URL}${END_POINTS_GET}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const u: UserProfile = res.data.data;
                console.log("Fetched user data:", u);
                setUser(u);

                // Set all form fields
                setName(u?.name || "");
                setFirstName(u?.first_name || "");
                setLastName(u?.last_name || "");
                setAddress(u?.address || "");
                setAddress2(u?.address_2 || "");
                setCity(u?.city || "");
                setState(u?.state || "");
                setZipCode(u?.zip_code || "");
                setCountry(u?.country || "United States");
                setInterestsItem(safeParseInterests(u?.interests));
            } catch (error: any) {
                console.error("Error loading data:", error?.response?.data || error);
                toast.show({
                    message: "Failed to load profile information.",
                    type: 'error',
                    style: 'top',
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const pickImage = async () => {
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            toast.show({
                message: "Permission to access the media library is required.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled) return;
        setImage(result);
    };

    const selectedImageUri = (image as any)?.assets?.[0]?.uri as string | undefined;

    const toggle = (item: string) => {
        setInterestsItem((prev) =>
            prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
        );
    };

    const handleSaveChanges = async () => {
        const token = await AsyncStorage.getItem("vToken");

        if (!token) {
            toast.show({
                message: "Token missing",
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!name.trim() && !firstName.trim()) {
            toast.show({
                message: "Please enter your name.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!address.trim()) {
            toast.show({
                message: "Please enter your address.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!city.trim()) {
            toast.show({
                message: "Please enter your city.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!state.trim()) {
            toast.show({
                message: "Please enter your state.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!zipCode.trim()) {
            toast.show({
                message: "Please enter your zip code.",
                type: 'error',
                style: 'top',
            });
            return;
        }

        const formData = new FormData();
        
        // ─── Add all fields to formData ──────────────────────────────────────
        formData.append("name", name.trim());
        formData.append("first_name", firstName.trim());
        formData.append("last_name", lastName.trim());
        formData.append("address", address.trim());
        formData.append("address_2", address2.trim());
        formData.append("city", city.trim());
        formData.append("state", state.trim());
        formData.append("zip_code", zipCode.trim());
        formData.append("country", country.trim());
        formData.append("interests", JSON.stringify(interestsItem));

        // only upload picture if user selected a new one
        if (selectedImageUri) {
            const selectedImage = (image as any).assets[0];

            formData.append(
                "profile_picture",
                {
                    uri: selectedImage.uri,
                    type: selectedImage.mimeType || "image/jpeg",
                    name: selectedImage.fileName || "profile.jpg",
                } as any
            );
        }

        try {
            const res = await axios.patch(`${API_BASE_URL}${END_POINTS_PATCH}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            console.log(res.data?.success)
            if (res.data.success == true) {
                setShowSuccessModal(true);
            } else {
                toast.show({
                    message: "Profile update failed",
                    type: 'warning',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error("PATCH error:", error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || "Update failed",
                type: 'warning',
                style: 'top',
            });
        }
    };

    // success modal auto close + go back
    useEffect(() => {
        if (!showSuccessModal) return;

        const t = setTimeout(() => {
            setShowSuccessModal(false);
            navigation.goBack();
        }, 2000);

        return () => clearTimeout(t);
    }, [showSuccessModal, navigation]);

    // spinner animation
    useEffect(() => {
        let spinnerInterval: any;

        if (showSuccessModal) {
            spinnerInterval = setInterval(() => {
                setSpinnerRotation((prev) => (prev + 45) % 360);
            }, 150);
        } else {
            setSpinnerRotation(0);
        }

        return () => {
            if (spinnerInterval) clearInterval(spinnerInterval);
        };
    }, [showSuccessModal]);

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

    const avatarUri = selectedImageUri || user?.profile_picture;

    return (
        <View className="bg-[#F9F9FB] flex-1 pb-15">
            <View className="px-5">
                <View className="flex-row items-center gap-4">
                    <AppHeader
                        left={() => <BackButton />}
                        middle={() => <Text className="text-lg font-semibold">Edit Profile</Text>}
                    />
                </View>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
                >
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 30 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Avatar */}
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
                            <View style={{ alignSelf: "center", position: "relative" }}>
                                <View
                                    style={{
                                        width: 128,
                                        height: 128,
                                        borderRadius: 64,
                                        backgroundColor: "white",
                                        overflow: "hidden",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {avatarUri ? (
                                        <Image
                                            source={{ uri: avatarUri }}
                                            style={{ width: "100%", height: "100%" }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <MaterialCommunityIcons name="account" size={64} color="#D1D6DB" />
                                    )}
                                </View>

                                <View
                                    style={{
                                        position: "absolute",
                                        right: 6,
                                        bottom: 6,
                                        backgroundColor: "white",
                                        borderRadius: 999,
                                        padding: 2,
                                    }}
                                >
                                    <MaterialIcons name="add-circle" size={28} color="#2355B6" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* ─── Name ────────────────────────────────────────────────── */}
                        <Text className="text-[#636F85] font-bold text-xl my-2">Full Name</Text>
                        <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 " style={styles.inputRow}>
                            <FontAwesome name="user" size={24} color="#334155"/>
                            <TextInput
                                placeholder="Your Name ex: Ahmed ReFat"
                                placeholderTextColor="#A0A0A0"
                                value={name}
                                onChangeText={setName}
                                style={styles.textInput}
                            />
                        </View>

                        {/* ─── First & Last Name ──────────────────────────────────── */}
                        {/* <View className="flex-row gap-4 mt-2">
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">First Name</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <FontAwesome name="user" size={20} color="#334155" />
                                    <TextInput
                                        placeholder="First Name"
                                        placeholderTextColor="#A0A0A0"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">Last Name</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <FontAwesome name="user" size={20} color="#334155" />
                                    <TextInput
                                        placeholder="Last Name"
                                        placeholderTextColor="#A0A0A0"
                                        value={lastName}
                                        onChangeText={setLastName}
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                        </View> */}

                        {/* ─── Email ────────────────────────────────────────────────── */}
                        <Text className="text-[#636F85] font-bold text-xl my-2">Email address</Text>
                        <View className="bg-gray-200 border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4">
                            <MaterialIcons name="email" size={24} color="#334155" />
                            <Text className="text-lg p-3">{user?.email || ""}</Text>
                        </View>

                        {/* ─── Address ────────────────────────────────────────────────── */}
                        <Text className="text-[#636F85] font-bold text-xl my-2">Address Line 1</Text>
                        <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                            <Ionicons name="location-sharp" size={24} color="black" />
                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder="123 Main St"
                                style={styles.textInput}
                            />
                        </View>

                        <Text className="text-[#636F85] font-bold text-xl my-2">Address Line 2 (Optional)</Text>
                        <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                            <Ionicons name="location-sharp" size={24} color="black" />
                            <TextInput
                                value={address2}
                                onChangeText={setAddress2}
                                placeholder="Apt 4B"
                                style={styles.textInput}
                            />
                        </View>

                        {/* ─── City, State, Zip ──────────────────────────────────────── */}
                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">City</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <Ionicons name="location-sharp" size={20} color="black" />
                                    <TextInput
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="Chicago"
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">State</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <Ionicons name="location-sharp" size={20} color="black" />
                                    <TextInput
                                        value={state}
                                        onChangeText={setState}
                                        placeholder="IL"
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">ZIP Code</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <Ionicons name="location-sharp" size={20} color="black" />
                                    <TextInput
                                        value={zipCode}
                                        onChangeText={setZipCode}
                                        placeholder="60601"
                                        keyboardType="numeric"
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#636F85] font-bold text-base my-2">Country</Text>
                                <View className="border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4" style={styles.inputRow}>
                                    <Ionicons name="location-sharp" size={20} color="black" />
                                    <TextInput
                                        value={country}
                                        onChangeText={setCountry}
                                        placeholder="United States"
                                        style={styles.textInput}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* ─── Interests ────────────────────────────────────────────────── */}
                        <Text className="text-xl my-4 font-bold text-[#111827]">Interests</Text>
                        <View className="flex-row flex-wrap gap-3 my-3">
                            {interests.map((item, index) => {
                                const active = interestsItem.includes(item);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => toggle(item)}
                                        className={`border rounded-full py-3 px-6 ${active
                                            ? "border-[#2355B6] border-2 bg-[#2355B61A]"
                                            : "border-[#D1D6DB]"
                                            }`}
                                    >
                                        <Text className={`text-lg ${active ? "text-[#2355B6] font-semibold" : ""}`}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ─── Save Button ────────────────────────────────────────────────── */}
                        <TouchableOpacity
                            style={styles.mainButton}
                            onPress={handleSaveChanges}
                            className="flex-row items-center justify-center gap-4 mb-28"
                            disabled={loading}
                        >
                            <Text style={styles.mainButtonText}>
                                {loading ? "Loading..." : "Save Changes"}
                            </Text>
                        </TouchableOpacity>

                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
            
            {/* ─── Success Modal ────────────────────────────────────────────────── */}
            <Modal
                transparent
                animationType="fade"
                visible={showSuccessModal}
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={StyleSheet.absoluteFill}>
                    <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
                    <View className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.60)]">
                        <View className="flex-1 justify-center items-center px-10">
                            <View className="w-full max-w-[350px]">
                                <View className="bg-white rounded-3xl p-10 items-center shadow-2xl">
                                    <View className="mt-6">
                                        <Image source={Images.Success} resizeMode="contain" />
                                    </View>

                                    <Text className="text-3xl font-bold text-center mt-8 mb-8">
                                        Successful!
                                    </Text>

                                    <Text className="text-xl text-[#636F85] text-center mb-8 leading-6">
                                        Your profile has been updated successfully.
                                    </Text>

                                    <View className="w-16 h-16 my-8 items-center justify-center">
                                        {spinnerDots.map((dot, index) => {
                                            const angle = (dot.angle + spinnerRotation) * (Math.PI / 180);
                                            const radius = 20;
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle) * radius;

                                            return (
                                                <View
                                                    key={index}
                                                    style={{
                                                        position: "absolute",
                                                        width: dot.size,
                                                        height: dot.size,
                                                        borderRadius: dot.size / 2,
                                                        backgroundColor: "#2355B6",
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
                    </View>
                </View>
            </Modal>
            
            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />

        </View>
    );
};

export default EditProfile;

const styles = StyleSheet.create({
    mainButton: {
        backgroundColor: "#2355B6",
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: "center",
        marginTop: 16,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    inputRow: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: Platform.OS === 'ios' ? 0 : 2,
        color: '#111827',
    },
});