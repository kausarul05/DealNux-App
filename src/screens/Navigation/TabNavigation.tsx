// MainTabs.tsx - Fixed with Proper Labels & Layout
import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Cart from "./Cart";
import Dashboard from "./Dashboard";
import Home from "./Home";
import Profile from "./Profile";
import Scanning from "./Scanning";

const Tab = createBottomTabNavigator();

// ─── Gradient Background ─────────────────────────────────────────────────────
const TabBarBackground = () => {
    return (
        <LinearGradient
            colors={['#FFFFFF', '#F8FAFC', '#FFFFFF']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
        />
    );
};

// ─── Center Scan Button ──────────────────────────────────────────────────────
function CenterButton({ children, onPress }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={styles.fabContainer}
        >
            <LinearGradient
                colors={['#2563EB', '#1A4D8F']}
                style={styles.fabButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <AntDesign name="scan" size={28} color="white" />
            </LinearGradient>
        </TouchableOpacity>
    );
}

// ─── Main Tab Navigator ──────────────────────────────────────────────────────
export default function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    ...styles.tabBar,
                    height: Platform.OS === 'ios' ? 95 : 80,
                },
                tabBarShowLabel: true,
                tabBarLabelPosition: 'below-icon',
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 2,
                    marginBottom: Platform.OS === 'ios' ? 4 : 0,
                },
                tabBarIconStyle: {
                    marginTop: Platform.OS === 'ios' ? 4 : 0,
                },
            }}
        >
            {/* Home Tab */}
            <Tab.Screen
                name="HomeTab"
                component={Home}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />

            {/* Cart Tab */}
            <Tab.Screen
                name="CartTab"
                component={Cart}
                options={{
                    tabBarLabel: 'Cart',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? "cart" : "cart-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />

            {/* Center Scan Button - No Label */}
            <Tab.Screen
                name="ScanTab"
                component={Scanning}
                options={{
                    tabBarLabel: '', // ✅ লেবেল খালি
                    tabBarIcon: () => null,
                    tabBarButton: (props) => <CenterButton {...props} />,
                }}
            />

            {/* Dashboard Tab */}
            <Tab.Screen
                name="MenuTab"
                component={Dashboard}
                options={{
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons
                            name={focused ? "view-dashboard" : "view-dashboard-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />

            {/* Profile Tab */}
            <Tab.Screen
                name="ProfileTab"
                component={Profile}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // ── Tab Bar Container ────────────────────────────────────────────────────
    tabBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: Platform.OS === 'ios' ? 90 : 75, // ✅ বড় করা হয়েছে লেবেলের জন্য
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderTopWidth: 0,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12, // ✅ iOS এর জন্য বেশি
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -6,
        },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 25,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'visible',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.04)',
    },

    // ── Center FAB Button ────────────────────────────────────────────────────
    fabContainer: {
        top: -28,
        alignItems: "center",
        justifyContent: "center",
        width: 64,
        height: 64,
        marginBottom: -10,
    },
    fabButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#2563EB",
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 15,
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
});