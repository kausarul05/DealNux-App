// components/ProductReviews.tsx
//
// Buyer reviews for a single product. Read-only list + summary; writing a
// review happens from MyOrders once the buyer confirms delivery, so that a
// review is always tied to a real purchase.
//
// API: GET  {IPA_BASE}store/reviews/?product_id=<id>
//      -> data: { average_rating, total_reviews, reviews: [...] }

import { Ionicons } from '@expo/vector-icons'
import { IPA_BASE } from '@env'
import axios from 'axios'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export const REVIEWS_ENDPOINT = `${IPA_BASE}store/reviews/`

export type ProductReview = {
    id: number
    rating: number
    comment: string
    created_at: string
    updated_at: string
    // Not sent by the API yet - rendered as "DEALNUX buyer" until it is.
    user_name?: string | null
}

type ReviewsPayload = {
    average_rating: number
    total_reviews: number
    reviews: ProductReview[]
}

export const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
                key={n}
                name={n <= Math.round(value) ? 'star' : 'star-outline'}
                size={size}
                color="#F59E0B"
            />
        ))}
    </View>
)

const formatDate = (raw: string) => {
    if (!raw) return ''
    // API sends "2026-07-20 08:43:54"; Safari/iOS will not parse that with the
    // space, so normalise it to ISO before constructing the Date.
    const date = new Date(raw.replace(' ', 'T'))
    if (Number.isNaN(date.getTime())) return raw
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
    productId: number | string
    /** Bumping this refetches - used after a review is submitted elsewhere. */
    refreshKey?: number
}

const ProductReviews = ({ productId, refreshKey = 0 }: Props) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ReviewsPayload | null>(null)
    const [expanded, setExpanded] = useState(false)

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await axios.get(REVIEWS_ENDPOINT, {
                params: { product_id: productId },
                headers: { Accept: 'application/json' },
                timeout: 15000,
            })
            const body = res.data?.data ?? res.data
            setData({
                average_rating: Number(body?.average_rating) || 0,
                total_reviews: Number(body?.total_reviews) || 0,
                reviews: Array.isArray(body?.reviews) ? body.reviews : [],
            })
        } catch (e: any) {
            console.error('❌ Reviews fetch error:', e?.response?.data || e)
            setError('Could not load reviews.')
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews, refreshKey])

    if (loading) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⭐ Buyer Reviews</Text>
                <View style={styles.stateBox}>
                    <ActivityIndicator color="#2355B6" />
                </View>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⭐ Buyer Reviews</Text>
                <View style={styles.stateBox}>
                    <Text style={styles.stateText}>{error}</Text>
                    <TouchableOpacity onPress={fetchReviews} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const reviews = data?.reviews ?? []
    // Reviews with no comment carry no information beyond the star average,
    // which is already shown above - so they are counted, not listed.
    const withComment = reviews.filter((r) => r.comment?.trim())
    const visible = expanded ? withComment : withComment.slice(0, 3)

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Buyer Reviews</Text>

            {data && data.total_reviews > 0 ? (
                <>
                    <View style={styles.summaryRow}>
                        <Text style={styles.average}>{data.average_rating.toFixed(1)}</Text>
                        <View style={{ gap: 4 }}>
                            <Stars value={data.average_rating} size={16} />
                            <Text style={styles.summaryCount}>
                                Based on {data.total_reviews}{' '}
                                {data.total_reviews === 1 ? 'review' : 'reviews'}
                            </Text>
                        </View>
                    </View>

                    {visible.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.avatar}>
                                    <Ionicons name="person" size={14} color="#64748B" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reviewer}>
                                        {review.user_name?.trim() || 'DEALNUX buyer'}
                                    </Text>
                                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                                </View>
                                <Stars value={review.rating} />
                            </View>
                            <Text style={styles.reviewBody}>{review.comment.trim()}</Text>
                        </View>
                    ))}

                    {withComment.length > 3 && (
                        <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.moreBtn}>
                            <Text style={styles.moreText}>
                                {expanded ? 'Show less' : `Show all ${withComment.length} reviews`}
                            </Text>
                            <Ionicons
                                name={expanded ? 'chevron-up' : 'chevron-down'}
                                size={15}
                                color="#2355B6"
                            />
                        </TouchableOpacity>
                    )}

                    {withComment.length === 0 && (
                        <Text style={styles.emptyText}>
                            No written reviews yet — only star ratings so far.
                        </Text>
                    )}
                </>
            ) : (
                <View style={styles.emptyBox}>
                    <Ionicons name="chatbox-ellipses-outline" size={30} color="#94A3B8" />
                    <Text style={styles.emptyText}>
                        No reviews yet. Buy this product and you can be the first to review it.
                    </Text>
                </View>
            )}
        </View>
    )
}

export default ProductReviews

const styles = StyleSheet.create({
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
    },
    average: { fontSize: 32, fontWeight: '800', color: '#92400E' },
    summaryCount: { fontSize: 12, color: '#92400E', opacity: 0.8 },

    reviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EEF0F3',
        padding: 14,
        marginBottom: 10,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewer: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    reviewDate: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
    reviewBody: { fontSize: 14, lineHeight: 21, color: '#4B5563' },

    moreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
    },
    moreText: { fontSize: 14, fontWeight: '600', color: '#2355B6' },

    emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 26 },
    emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },

    stateBox: { alignItems: 'center', gap: 12, paddingVertical: 26 },
    stateText: { fontSize: 13, color: '#64748B' },
    retryBtn: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#2355B6',
    },
    retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
})
