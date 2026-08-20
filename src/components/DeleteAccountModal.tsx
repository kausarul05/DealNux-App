// components/DeleteAccountModal.tsx
//
// Two-step account deletion, used for every account type:
//   1. POST  account/delete-account/send-otp/   → emails a 4-digit code
//   2. DELETE account/delete-account/           → { email, otp } and the account is gone
//
// The OTP route works for password users and Google/Apple users alike, so there
// is no need to branch on whether the account has a password.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { DELETE_ACCOUNT, DELETE_ACCOUNT_SEND_OTP, IPA_BASE } from '@env'

// `.env` is git-ignored, so fall back to the known paths on a fresh checkout.
const SEND_OTP_PATH = DELETE_ACCOUNT_SEND_OTP || 'account/delete-account/send-otp/'
const DELETE_PATH = DELETE_ACCOUNT || 'account/delete-account/'

const RESEND_SECONDS = 60
const OTP_LENGTH = 4

// Everything written at login, cleared once the account is gone.
const AUTH_KEYS = [
    'vToken',
    'vRefreshToken',
    'userData',
    'userEmail',
    'rememberMe',
    'rememberedEmail',
    'notificationPreferences',
    'seller_application_draft',
    'appSettings',
]

interface DeleteAccountModalProps {
    visible: boolean
    email?: string
    onClose: () => void
    onDeleted: () => void
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
    visible,
    email,
    onClose,
    onDeleted,
}) => {
    const [step, setStep] = useState<'confirm' | 'otp'>('confirm')
    const [otp, setOtp] = useState('')
    const [sentTo, setSentTo] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [secondsLeft, setSecondsLeft] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    const startTimer = () => {
        stopTimer()
        setSecondsLeft(RESEND_SECONDS)
        timerRef.current = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    stopTimer()
                    return 0
                }
                return s - 1
            })
        }, 1000)
    }

    // Reset back to the first step whenever the sheet is reopened.
    useEffect(() => {
        if (visible) {
            setStep('confirm')
            setOtp('')
            setError('')
            setSentTo('')
            setSecondsLeft(0)
        } else {
            stopTimer()
        }
    }, [visible])

    useEffect(() => stopTimer, [])

    const authHeaders = async () => {
        const token = await AsyncStorage.getItem('vToken')
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    }

    const messageFrom = (e: any, fallback: string) =>
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        e?.message ||
        fallback

    const sendOtp = useCallback(async () => {
        setBusy(true)
        setError('')
        try {
            const res = await axios.post(
                `${IPA_BASE}${SEND_OTP_PATH}`,
                {},
                { headers: await authHeaders(), timeout: 20000 },
            )
            setSentTo(res?.data?.data?.email || email || '')
            setStep('otp')
            startTimer()
        } catch (e: any) {
            setError(messageFrom(e, 'Could not send the verification code. Please try again.'))
        } finally {
            setBusy(false)
        }
    }, [email])

    const confirmDelete = useCallback(async () => {
        if (otp.length !== OTP_LENGTH) {
            setError(`Please enter the ${OTP_LENGTH}-digit code.`)
            return
        }
        setBusy(true)
        setError('')
        try {
            const refresh = await AsyncStorage.getItem('vRefreshToken')
            await axios.request({
                url: `${IPA_BASE}${DELETE_PATH}`,
                method: 'DELETE',
                headers: await authHeaders(),
                data: {
                    email: sentTo || email || '',
                    otp,
                    ...(refresh ? { refresh } : {}),
                },
                timeout: 20000,
            })

            stopTimer()
            await AsyncStorage.multiRemove(AUTH_KEYS)
            onDeleted()
        } catch (e: any) {
            setError(messageFrom(e, 'Could not delete the account. Please check the code and try again.'))
        } finally {
            setBusy(false)
        }
    }, [otp, sentTo, email, onDeleted])

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    </View>

                    {step === 'confirm' ? (
                        <>
                            <Text style={styles.title}>Delete account</Text>
                            <Text style={styles.body}>
                                This permanently deletes your DealNux account along with your
                                orders, favourites and saved details. It cannot be undone.
                            </Text>
                            <Text style={styles.body}>
                                We will email a verification code to confirm it is really you.
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.title}>Enter verification code</Text>
                            <Text style={styles.body}>
                                We sent a {OTP_LENGTH}-digit code to{' '}
                                <Text style={styles.email}>{sentTo || email}</Text>.
                            </Text>

                            <TextInput
                                style={styles.otpInput}
                                value={otp}
                                onChangeText={(t) => {
                                    setOtp(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))
                                    if (error) setError('')
                                }}
                                keyboardType="number-pad"
                                maxLength={OTP_LENGTH}
                                placeholder="––––"
                                placeholderTextColor="#CBD5E1"
                                autoFocus
                                editable={!busy}
                            />

                            <TouchableOpacity
                                onPress={sendOtp}
                                disabled={busy || secondsLeft > 0}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.resend, secondsLeft > 0 && styles.resendOff]}>
                                    {secondsLeft > 0
                                        ? `Resend code in ${secondsLeft}s`
                                        : 'Resend code'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {!!error && <Text style={styles.error}>{error}</Text>}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGhost]}
                            onPress={onClose}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnGhostText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnDanger, busy && styles.btnDisabled]}
                            onPress={step === 'confirm' ? sendOtp : confirmDelete}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            {busy ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.btnDangerText}>
                                    {step === 'confirm' ? 'Send code' : 'Delete account'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    sheet: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    email: {
        color: '#1F2937',
        fontWeight: '600',
    },
    otpInput: {
        marginTop: 8,
        width: 160,
        height: 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 10,
        color: '#1F2937',
    },
    resend: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '600',
        color: '#2563EB',
    },
    resendOff: {
        color: '#9CA3AF',
    },
    error: {
        marginTop: 12,
        fontSize: 13,
        color: '#EF4444',
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        width: '100%',
    },
    btn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnGhost: {
        backgroundColor: '#F1F5F9',
    },
    btnGhostText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    btnDanger: {
        backgroundColor: '#EF4444',
    },
    btnDangerText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    btnDisabled: {
        opacity: 0.7,
    },
})

export default DeleteAccountModal
