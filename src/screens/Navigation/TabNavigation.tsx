// MainTabs.tsx - Fixed with Proper Radius & Text
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
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
                tabBarBackground: () => <TabBarBackground />,
            }}
        >
            {/* Home Tab */}
            <Tab.Screen
                name="HomeTab"
                component={Home}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "home" : "home-outline"}
                                size={26}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text 
                                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Home
                            </Text>
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    ),
                }}
            />

            {/* Cart Tab */}
            <Tab.Screen
                name="CartTab"
                component={Cart}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "cart" : "cart-outline"}
                                size={26}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text 
                                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Cart
                            </Text>
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    ),
                }}
            />

            {/* Center Scan Button */}
            <Tab.Screen
                name="ScanTab"
                component={Scanning}
                options={{
                    tabBarIcon: () => null,
                    tabBarButton: (props) => <CenterButton {...props} />,
                }}
            />

            {/* Dashboard Tab */}
            <Tab.Screen
                name="MenuTab"
                component={Dashboard}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <MaterialCommunityIcons
                                name={focused ? "view-dashboard" : "view-dashboard-outline"}
                                size={26}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text 
                                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Dashboard
                            </Text>
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    ),
                }}
            />

            {/* Profile Tab */}
            <Tab.Screen
                name="ProfileTab"
                component={Profile}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "person" : "person-outline"}
                                size={26}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text 
                                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Profile
                            </Text>
                            {focused && <View style={styles.activeDot} />}
                        </View>
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
        height: Platform.OS === 'ios' ? 85 : 75,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 0,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -6,
        },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 25,
        // ✅ Proper border radius for top corners only
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'visible',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.04)',
    },

    // ── Tab Item ─────────────────────────────────────────────────────────────
    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        flex: 1,
        paddingVertical: 2,
        position: 'relative',
        // ✅ Prevent text from breaking
        flexShrink: 1,
        minWidth: 0,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: "500",
        color: "#9CA3AF",
        // ✅ Prevent text wrapping
        flexShrink: 1,
        flexWrap: "nowrap",
        textAlign: "center",
        maxWidth: 80, // ✅ Limit width to prevent overflow
    },
    tabLabelActive: {
        color: "#2563EB",
        fontWeight: "600",
    },
    activeDot: {
        position: 'absolute',
        top: -2,
        width: 18,
        height: 3,
        borderRadius: 2,
        backgroundColor: "#2563EB",
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
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