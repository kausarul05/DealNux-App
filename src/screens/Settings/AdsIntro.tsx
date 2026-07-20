// AdsIntro.tsx
//
// Shown the first time a user taps "Advertise with us" (advertiser_status ===
// "not_applied"). Explains what advertising on DEALNUX involves before dropping
// them into the application form.
//
// NOTE FOR COPY REVIEW: the steps below are deliberately free of pricing and
// review-time claims because those have not been confirmed by the client yet.
// Once they are, fill in:
//   - COST: see the "What it costs" card below.
//   - REVIEW TIME: step 2 currently says "our team reviews it" with no duration.

import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { AuthStackParamList } from '../../Navigation/types'

type Step = {
    icon: keyof typeof Ionicons.glyphMap
    title: string
    body: string
}

const STEPS: Step[] = [
    {
        icon: 'document-text-outline',
        title: '1. Tell us about your business',
        body: 'Share your business name, what you sell, and your website if you have one. It takes about a minute.',
    },
    {
        icon: 'shield-checkmark-outline',
        title: '2. We review your application',
        body: 'Our team checks that your business is a good fit for DEALNUX shoppers. You can keep using the app normally while you wait.',
    },
    {
        icon: 'notifications-outline',
        title: '3. You get notified',
        body: "We'll let you know as soon as a decision is made. Your status is always visible under Advertise with us.",
    },
    {
        icon: 'megaphone-outline',
        title: '4. Start advertising',
        body: 'Once approved, you can create ads and put your products in front of shoppers who are already comparing prices.',
    },
]

const AdsIntro = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()

    return (
        <View style={styles.screen}>
            <View style={styles.headerWrap}>
                <AppHeader
                    left={() => <BackButton />}
                    middle={() => <Text style={styles.headerTitle}>Advertise with us</Text>}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="megaphone" size={26} color="#2355B6" />
                    </View>
                    <Text style={styles.heroTitle}>Reach shoppers who are ready to buy</Text>
                    <Text style={styles.heroText}>
                        DEALNUX users open the app to compare prices and find deals. Advertising
                        puts your business in front of them at the moment they are deciding where
                        to shop.
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>How it works</Text>

                {STEPS.map((step, index) => (
                    <View key={step.title} style={styles.stepRow}>
                        <View style={styles.stepRail}>
                            <View style={styles.stepIcon}>
                                <Ionicons name={step.icon} size={18} color="#2355B6" />
                            </View>
                            {index < STEPS.length - 1 && <View style={styles.stepLine} />}
                        </View>

                        <View style={styles.stepBody}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepText}>{step.body}</Text>
                        </View>
                    </View>
                ))}

                <View style={styles.noteCard}>
                    <Ionicons name="information-circle-outline" size={18} color="#2355B6" />
                    <Text style={styles.noteText}>
                        Applying does not create an ad and does not charge you anything. It creates
                        your business profile so our team can review it.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    // replace, not navigate: after applying, back should land on
                    // Profile rather than re-showing this explainer.
                    onPress={() => navigation.replace('AdsApply')}
                    activeOpacity={0.9}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Get started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default AdsIntro

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F9F9FB' },
    headerWrap: { paddingHorizontal: 20 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

    body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

    hero: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EEF0F3',
        marginBottom: 28,
    },
    heroIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#EAF0FB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 27,
    },
    heroText: { fontSize: 14, lineHeight: 21, color: '#64748B' },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },

    stepRow: { flexDirection: 'row', gap: 14 },
    stepRail: { alignItems: 'center', width: 36 },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EAF0FB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepLine: { flex: 1, width: 2, backgroundColor: '#E3E8F0', marginVertical: 4 },
    stepBody: { flex: 1, paddingBottom: 22 },
    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
        marginTop: 7,
    },
    stepText: { fontSize: 14, lineHeight: 21, color: '#64748B' },

    noteCard: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: '#EAF0FB',
        borderRadius: 14,
        padding: 14,
        marginTop: 4,
    },
    noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#2A4574' },

    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#F9F9FB',
        borderTopWidth: 1,
        borderTopColor: '#EEF0F3',
    },
    primaryButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
    },
    primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})
