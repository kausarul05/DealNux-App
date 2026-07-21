// MainTabs.tsx - Complete Updated Version
import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import { IPA_BASE, CART_PRODUCT } from "@env";
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

// ─── Cart Icon with Badge ────────────────────────────────────────────────────
const CartIconWithBadge = ({ focused, color, size, cartCount }: any) => {
    return (
        <View style={{ position: 'relative' }}>
            <Ionicons
                name={focused ? "cart" : "cart-outline"}
                size={size || 26}
                color={color}
            />
            {cartCount > 0 && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                        {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                </View>
            )}
        </View>
    );
};

// ─── Main Tab Navigator ──────────────────────────────────────────────────────
export default function MainTabs() {
    const [cartCount, setCartCount] = useState(0);
    const cartUpdateRef = useRef<(count: number) => void>();

    // ─── Fetch Cart Count ──────────────────────────────────────────────────────
    const fetchCartCount = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('vToken');
            if (!token) return;

            const response = await axios.get(`${IPA_BASE}${CART_PRODUCT}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const data = response?.data?.data;
            if (data?.summary?.total_items !== undefined) {
                setCartCount(data.summary.total_items);
            } else {
                // Fallback: count items from platforms
                let total = 0;
                if (data?.platforms) {
                    Object.values(data.platforms).forEach((items: any) => {
                        total += items.length;
                    });
                }
                setCartCount(total);
            }
        } catch (error) {
            console.error('❌ Error fetching cart count:', error);
        }
    }, []);

    // ─── Handle cart update from Cart component ──────────────────────────────
    const handleCartUpdate = useCallback((count: number) => {
        setCartCount(count);
    }, []);

    // ─── Store callback in ref for Cart component ─────────────────────────────
    useEffect(() => {
        cartUpdateRef.current = handleCartUpdate;
    }, [handleCartUpdate]);

    // ─── Initial fetch ────────────────────────────────────────────────────────
    useEffect(() => {
        fetchCartCount();
    }, [fetchCartCount]);

    useFocusEffect(
        useCallback(() => {
            fetchCartCount();
            return () => { };
        }, [fetchCartCount])
    );

    return (
        <Tab.Navigator
            screenOptions={{
                // Left off deliberately: MainTabs sits inside AuthStack, which
                // already renders <BrandHeader compact /> above this navigator.
                // Enabling it here would stack two logos on every tab page.
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
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />

            {/* Cart Tab with Badge */}
            <Tab.Screen
                name="CartTab"
                component={() => (
                    <Cart onCartUpdate={handleCartUpdate} />
                )}
                options={{
                    tabBarLabel: 'Cart',
                    tabBarIcon: ({ focused, color, size }) => (
                        <CartIconWithBadge
                            focused={focused}
                            color={color}
                            size={26}
                            cartCount={cartCount}
                        />
                    ),
                }}
                listeners={{
                    tabPress: () => {
                        // Refresh cart count when Cart tab is pressed
                        setTimeout(() => fetchCartCount(), 100);
                    },
                }}
            />

            {/* Center Scan Button - No Label */}
            <Tab.Screen
                name="ScanTab"
                component={Scanning}
                options={{
                    tabBarLabel: '',
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
    tabBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: Platform.OS === 'ios' ? 90 : 75,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderTopWidth: 0,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
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
    // ─── Badge Styles ────────────────────────────────────────────────────────
    badgeContainer: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
});