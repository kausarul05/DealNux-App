// components/ReturnPolicyLink.tsx
//
// Seller return policy link for DEALNUX local checkout. Shown wherever a local
// order is confirmed so buyers can read the policy before paying.

import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import { IPA_BASE } from '@env'
import React, { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

const RETURN_POLICY_ENDPOINT = `${IPA_BASE}policy/return-policy/`

type Props = {
    /** Overrides the default link text. */
    label?: string
    style?: any
}

const ReturnPolicyLink = ({ label = "Read the seller's return policy", style }: Props) => {
    const [visible, setVisible] = useState(false)
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchPolicy = useCallback(async () => {
        // Cached after the first successful open - the policy rarely changes.
        if (content) return
        try {
            setLoading(true)
            setError(null)
            const res = await axios.get(RETURN_POLICY_ENDPOINT, {
                headers: { Accept: 'application/json' },
                timeout: 15000,
            })
            const body = res.data?.data ?? res.data
            const text = body?.content?.trim()
            if (text) {
                setContent(text)
            } else {
                setError('Return policy is not available right now.')
            }
        } catch (e: any) {
            console.error('❌ Return policy fetch error:', e?.response?.data || e)
            setError('Could not load the return policy. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [content])

    const open = () => {
        setVisible(true)
        fetchPolicy()
    }

    return (
        <>
            <TouchableOpacity
                onPress={open}
                activeOpacity={0.7}
                style={[styles.linkRow, style]}
                hitSlop={8}
            >
                <Ionicons name="document-text-outline" size={14} color="#2355B6" />
                <Text style={styles.linkText}>{label}</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <View style={styles.handle} />

                        <View style={styles.header}>
                            <Text style={styles.title}>Return Policy</Text>
                            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.stateBox}>
                                <ActivityIndicator size="large" color="#2355B6" />
                                <Text style={styles.stateText}>Loading return policy…</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.stateBox}>
                                <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
                                <Text style={styles.stateText}>{error}</Text>
                                <TouchableOpacity onPress={fetchPolicy} style={styles.retryBtn}>
                                    <Text style={styles.retryText}>Try again</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.body}
                                contentContainerStyle={{ paddingBottom: 24 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={styles.content}>{content}</Text>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    linkText: {
        fontSize: 13,
        color: '#2355B6',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 24,
        maxHeight: '80%',
    },
    handle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { marginTop: 4 },
    content: { fontSize: 14, lineHeight: 22, color: '#4B5563' },
    stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
    stateText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#2355B6',
    },
    retryText: { color: '#FFFFFF', fontWeight: '600' },
})

export default ReturnPolicyLink
