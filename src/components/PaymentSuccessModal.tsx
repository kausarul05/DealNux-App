import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export const PaymentSuccessModal = ({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={m.overlay} onPress={onClose} />

            <View style={m.center}>
                <View style={m.card}>
                    <View style={m.iconOuter}>
                        <View style={m.iconInner}>
                            <Ionicons name="card" size={28} color="#1D4ED8" />
                        </View>
                    </View>

                    <Text style={m.title}>Payment{"\n"}Successfully</Text>
                    <Text style={m.sub}>
                        Your payment has been done{"\n"}successfully.
                    </Text>

                    <View style={{ marginTop: 18 }}>
                        <ActivityIndicator size="large" color="#1D4ED8" />
                    </View>
                </View>
            </View>
        </Modal>
        
    );
};

const m = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(17,24,39,0.35)",
    },
    center: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 22,
    },
    card: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingVertical: 30,
        paddingHorizontal: 22,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 10,
    },
    iconOuter: {
        width: 110,
        height: 110,
        borderRadius: 999,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    iconInner: {
        width: 76,
        height: 76,
        borderRadius: 999,
        backgroundColor: "#E0E7FF",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 36,
        fontWeight: "900",
        color: "#2D2D2D",
        textAlign: "center",
        lineHeight: 42,
        marginBottom: 10,
    },
    sub: {
        fontSize: 22,
        fontWeight: "600",
        color: "#64748B",
        textAlign: "center",
        lineHeight: 28,
    },
});
