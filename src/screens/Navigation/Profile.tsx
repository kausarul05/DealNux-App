import { IPA_BASE, PROFILE } from "@env";
import {
    Entypo,
    Feather,
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthStackParamList } from "../../Navigation/types";
import { Toast, useToast } from "../../components/useToost";

const Card = ({ children, className = "" }: any) => (
    <View className={`bg-white rounded-2xl shadow-sm shadow-black/10 ${className}`}>
        {children}
    </View>
);

const PaymentMethodModal = ({
    visible,
    onClose,
    onAddCard,
    onConfirm,
}: {
    visible: boolean;
    onClose: () => void;
    onAddCard: () => void;
    onConfirm: () => void;
}) => {
    return (
        <Modal transparent visible={visible} animationType="fade">

            <Pressable onPress={onClose} className="flex-1 bg-black/40" />


            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] px-6 pt-4 pb-7 items-center justify-center">
                

                <View className="bg-[#2354b62a] rounded-full p-4 items-center justify-center mx-auto mb-4">
                    <View className="bg-[#2354b62a] rounded-full p-5 items-center justify-center">
                        <Ionicons name="help-circle" size={40} color="#2355B6" />
                  </View>
                </View>
                <Text className="text-3xl font-bold text-[#2D2D2D] text-center mb-4">
                    Logout
                </Text>
                <Text className="text-xl text-center mb-5">
                    Are you sure you want
                    to log out?
                </Text>

                <View className="flex-row gap-5 items-center justify-center my-5">
                    <TouchableOpacity onPress={onClose} className="bg-[#2354b623] rounded-2xl px-6 py-3 mt-5">
                        <Text className="text-black font-bold text-xl">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onConfirm} className="bg-[#2355B6] rounded-2xl px-6 py-3 mt-5" >
                        <Text className="text-white font-bold text-xl">Yes, Logout </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const QuickCard = ({ icon, title, iconBg = "#EEF2FF", onPress }: any) => (
    <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        className="flex-1 bg-white rounded-2xl py-5 items-center justify-center shadow-sm shadow-black/10"
    >
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: iconBg }}>
            {icon}
        </View>
        <Text className="mt-3 text-base font-bold text-[#2D2D2D]">{title}</Text>
    </TouchableOpacity>
);

const RowItem = ({ leftIcon, title, rightIcon = true, onPress }: any) => (
    <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        className="flex-row items-center justify-between py-4"
    >
        <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-full bg-[#F3F4F6] items-center justify-center">
                {leftIcon}
            </View>
            <Text className="text-[15px] text-[#2D2D2D] font-semibold">{title}</Text>
        </View>

        {rightIcon ? (
            <Feather name="external-link" size={18} color="#636F85" />
        ) : null}
    </TouchableOpacity>
);

const Divider = () => <View className="h-[1px] bg-[#EEF0F3]" />;

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
type UserProfile = {
    name: string;
    email: string;
    profile_picture: string;
    address: string;
    interests: string[]; 
    refaradal_code: string;
    balance: number;
    advertiser_status: {
        status: string;
    };
    seller_status: {
        status: string;
    };
    has_claimed_referral: boolean;
    referred_by: string | null;
};


const API_BASE_URL = IPA_BASE;
const END_POINTS = PROFILE;

const Profile = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [payOpen, setPayOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                // console.log("Profile Screen Focused 🔄");

                const token = await AsyncStorage.getItem("vToken");

                try {
                    const res = await axios.get(
                        `${API_BASE_URL}${END_POINTS}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    // console.log(res.data)
                    setUser(res.data.data);
                    // console.log(user?.advertiser_status?.status)
                } catch (error) {
                    console.error("Error loading data:", error);
                }
            };

            loadData();
        }, [])
    );


    const shop = () => {
        console.log(user?.seller_status)
        if (user?.seller_status.status == "not_applied") {
            navigation.navigate("ShopCreate")
        } else if (user?.seller_status.status == "pending") {
            toast.show({
                message:
                    ("Your Shop Request Is Pending."),
                type: 'error',
                style: 'top',
            });
        }
        else {
            navigation.navigate("ShopDashboard")
        }
    }

    const myAds = () => {
        if (user?.advertiser_status.status == "not_applied") {
            navigation.navigate("AdsApply")
        } else if (user?.advertiser_status.status == "pending") {
            toast.show({
                message:
                    ("Your Business Profile Request Is Pending."),
                type: 'error',
                style: 'top',
            });
        }
        else {
            navigation.navigate("MyAds")
        }

    }
    return (
        <SafeAreaView className="flex-1 bg-[#F9F9FB]">

            <View className="px-5 ">
                {/* Header */}
                <View className="items-center my-2">
                        <Text className="text-lg font-bold text-[#2D2D2D]">My Profile</Text>
                </View>
                <ScrollView className="mb-28" showsVerticalScrollIndicator={false}>
                    {/* Avatar */}
                    <View className="items-center">
                        <View className="w-32 h-32 rounded-full bg-white items-center justify-center shadow-sm shadow-black/10 overflow-hidden">
                            {user?.profile_picture ? (
                                <Image
                                    source={{ uri: user.profile_picture }}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <MaterialCommunityIcons name="account" size={64} color="#D1D6DB" />
                            )}
                        </View>
                    </View>

                    <Text className="text-2xl font-extrabold text-center mt-4 text-[#2D2D2D]">
                        {user?.name}
                    </Text>
                    <Text className="text-lg text-center mt-1 text-[#636F85] font-semibold">
                        {user?.email}
                    </Text>
                    
                        <LinearGradient
                        style={styles.balanceCard}
                        colors={['#0057FF', '#61B3FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="mt-4 rounded-[28px] px-5 py-5 items-center justify-center"
                            
                        >
                            <Text className="text-[28px] font-bold text-white">
                                ${Number(user?.balance || 0.00).toFixed(2)}
                            </Text>
                            <Text className="text-[14px] text-white mt-1 font-medium">
                                USD Balance
                            </Text>
                    </LinearGradient>
                   
                    {/* style={{
                                backgroundColor: '#CDEFD4',
                                shadowColor: '#000',
                                shadowOpacity: 0.06,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 4 },
                                elevation: 3,
                            }} */}

                    {/* Quick actions */}
                    <View className="flex-row gap-4 mt-6">
                        <QuickCard
                            title="My Favourite"
                            icon={<Ionicons name="heart" size={20} color="#EF4444" />}
                            iconBg="#FEE2E2"
                            onPress={() => navigation.navigate("MyFavourite")}
                        />
                        <QuickCard
                            title="Subscription"
                            icon={<Ionicons name="diamond" size={20} color="#2563EB" />}
                            iconBg="#DBEAFE"
                            onPress={() => navigation.navigate("Subscription")}
                        />
                    </View>

                    <View className="flex-row gap-4 mt-4">
                        <QuickCard
                            title="Refer & Earn"
                            icon={<Ionicons name="gift" size={20} color="#F59E0B" />}
                            iconBg="#FEF3C7"
                            onPress={() => (navigation as any).navigate("ReFarAndEarn", {
                                user: user
                            })}
                        />
                        <QuickCard
                            title="Review App"
                            icon={<Ionicons name="star" size={20} color="#F59E0B" />}
                            iconBg="#FEF3C7"
                            onPress={() => (navigation as any).navigate("AppReview")}
                        />
                    </View>
                    {/* Shop Create and Manage */}
                    <Card className="mt-5 px-4">
                        <RowItem
                            title={user?.seller_status.status == "approved" ? "Seller dashboard": "Become a seller" }
                            leftIcon={
                                <Entypo name="shop" size={16} color="#2355B6" />
                            }
                            onPress={shop}
                        />
                    </Card>

                    {/* Advertise with us */}
                    <Card className="mt-5 px-4">
                        <RowItem
                            title="Advertise with us"
                            leftIcon={<FontAwesome5 name="paint-brush" size={16} color="#2355B6" />}
                            onPress={myAds}
                        />
                    </Card>
                    {/* Personal Information */}
                    <Card className="mt-5 px-4 pt-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-lg font-bold text-[#2D2D2D]">Personal Information</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
                                <MaterialIcons name="edit" size={24} color="#636F85" />
                            </TouchableOpacity>
                        </View>

                        <RowItem
                            title={user?.name}
                            rightIcon={false}
                            leftIcon={<Ionicons name="person" size={16} color="#636F85" />}
                        />
                        <Divider />
                        <RowItem
                            title={user?.email}
                            rightIcon={false}
                            leftIcon={<MaterialCommunityIcons name="email-outline" size={16} color="#636F85" />}
                        />
                        <Divider />
                        <RowItem
                            title={user?.address}
                            rightIcon={false}
                            leftIcon={<Ionicons name="location-outline" size={16} color="#636F85" />}
                        />
                        <Divider />
                        <RowItem
                            title={user?.interests?.join(", ")}
                            rightIcon={false}
                            leftIcon={<MaterialCommunityIcons name="dots-grid" size={16} color="#636F85" />}
                        />
                    </Card>

                    {/* Settings */}
                    <Card className="mt-5 px-4 pt-4">
                        <Text className="text-lg font-bold text-[#2D2D2D] mb-2">Settings</Text>
{/* 
                        <RowItem
                            title="Notifications"
                            leftIcon={<Ionicons name="notifications-outline" size={16} color="#636F85" />}
                            onPress={() => navigation.navigate("NotificationSettings")}
                        />
                        <Divider /> */}

                        <RowItem
                            title="Change Password"
                            leftIcon={<Ionicons name="key-outline" size={16} color="#636F85" />}
                            onPress={() => navigation.navigate("UpdatePassword")}
                        />

                    </Card>

                    {/* Company */}
                    <Card className="mt-5 px-4 pt-4">
                        <Text className="text-base font-bold text-[#2D2D2D] mb-2">Company</Text>

                        <RowItem
                            title="About Us"
                            onPress={() => navigation.navigate("aboutus")}
                            leftIcon={<Ionicons name="information-circle-outline" size={16} color="#636F85" />}
                        />
                        <Divider />
                        <RowItem
                            title="Contact Us"
                            onPress={() => navigation.navigate("contactus")}
                            leftIcon={<Ionicons name="person-circle-outline" size={16} color="#636F85" />}
                        />
                        {/* <Divider />
                        <RowItem
                            title="Video Demo"
                            leftIcon={<Ionicons name="videocam-outline" size={16} color="#636F85" />}
                        /> */}
                        {/* <Divider /> */}
                        {/* <RowItem
                            title="Press"
                            leftIcon={<MaterialCommunityIcons name="newspaper-variant-outline" size={16} color="#636F85" />}
                        /> */}
                        {/* <Divider /> */}
                        {/* <RowItem
                            title="Events"
                            leftIcon={<Ionicons name="calendar-outline" size={16} color="#636F85" />}
                        /> */}
                    </Card>

                    {/* Legal */}
                    <Card className="mt-5 px-4 pt-4">
                        <Text className="text-base font-bold text-[#2D2D2D] mb-2">Legal</Text>

                        <RowItem
                            title="Privacy policy"
                            leftIcon={<MaterialCommunityIcons name="shield-check-outline" size={16} color="#636F85" />}
                            onPress={() => navigation.navigate("PrivacyPolicy")}
                        />
                        <Divider />
                        <RowItem
                            title="Terms of Service"
                            onPress={() => navigation.navigate("TermsOfService")}
                            leftIcon={<MaterialCommunityIcons name="music-note-outline" size={16} color="#636F85" />}
                        />
                    </Card>

                    {/* Connect */}
                    <Card className="mt-5 px-4 pt-4">
                        <Text className="text-base font-bold text-[#2D2D2D] mb-3">Connect</Text>

                        <View className="flex-row justify-between px-1 mb-3">
                            {/* <View className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="logo-whatsapp" size={20} color="green" />
                            </View> */}
                            <Pressable onPress={() => Linking.openURL("https://www.tiktok.com/@dealnux")} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="logo-tiktok" size={20} color="black" />
                            </Pressable>
                            {/* <Pressable onPress={() => Linking.canOpenURL("https://www.tiktok.com/@dealnux ")} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <AntDesign name="x" size={18} color="black" />
                            </Pressable> */}
                            <Pressable onPress={() => Linking.openURL("https://www.facebook.com/profile.php?id=61588412872195")} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="logo-facebook" size={20} color="blue" />
                            </Pressable>
                            <Pressable onPress={() => Linking.openURL("https://www.youtube.com/channel/UC0_MpWGIwWlLQZOLrzgPIug")} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="logo-youtube" size={20} color="red" />
                            </Pressable>
                            <Pressable onPress={() => Linking.openURL("https://www.instagram.com/dealnux/")} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="logo-instagram" size={20} color="red" />
                            </Pressable>
                        </View>

                        <Divider />

                        {/* <RowItem
                            title="Request Our Services"
                            leftIcon={<MaterialCommunityIcons name="file-document-outline" size={16} color="#636F85" />}
                        /> */}
                    </Card> 

                    {/* Logout */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        className="mt-5 bg-white rounded-2xl px-4 py-4 flex-row items-center gap-3 shadow-sm shadow-black/10 mb-8"
                        onPress={() => setPayOpen(true)}
                    >
                        <View className="w-9 h-9 rounded-full bg-[#FEE2E2] items-center justify-center">
                            <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
                        </View>
                        <Text className="text-[15px] font-bold text-[#EF4444]">Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <PaymentMethodModal
                visible={payOpen}
                onClose={() => setPayOpen(false)}
                onAddCard={() => {

                    setPayOpen(false);
                }}
                onConfirm={() => {

                    navigation.reset({
                        index: 0,
                        routes: [{ name: "SignIn" }],
                    });
                }}
            />
            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />
        </SafeAreaView>
    );
};

export default Profile;

const styles = StyleSheet.create({
    balanceCard: {
        borderRadius: 28,
        paddingVertical: 40,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 0,
    },
})