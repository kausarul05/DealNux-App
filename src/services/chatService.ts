// services/chatService.ts
import io, { Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CHAT_API_URL = 'https://ai.dealnux.shop'
const WS_URL = 'ws://ai.dealnux.shop'

export interface ChatProduct {
    id: number
    title: string
    image_url: string
    price: number
    original_price: number | null
    discount_percentage: number | null
    platform_name: string
    external_url: string
    condition: string
    currency: string
    free_shipping: boolean
}

export interface ChatMessage {
    reply_text: string
    products?: ChatProduct[]
    suggested_replies?: string[]
}

export interface GuestTokenResponse {
    token: string
    user_id: string
}

class ChatService {
    private socket: Socket | null = null
    private token: string | null = null
    private userId: string | null = null

    async getGuestToken(): Promise<string> {
        try {
            // Check if token exists in storage
            const storedToken = await AsyncStorage.getItem('chat_guest_token')
            const storedUserId = await AsyncStorage.getItem('chat_guest_user_id')
            
            if (storedToken && storedUserId) {
                this.token = storedToken
                this.userId = storedUserId
                return storedToken
            }

            // Get new token
            const response = await fetch(`${CHAT_API_URL}/api/auth/guest-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to get guest token')
            }

            const data: GuestTokenResponse = await response.json()
            
            // Store token
            this.token = data.token
            this.userId = data.user_id
            
            await AsyncStorage.setItem('chat_guest_token', data.token)
            await AsyncStorage.setItem('chat_guest_user_id', data.user_id)
            
            return data.token
        } catch (error) {
            console.error('Error getting guest token:', error)
            throw error
        }
    }

    connect(token: string): Socket {
        if (this.socket && this.socket.connected) {
            return this.socket
        }

        this.socket = io(`${WS_URL}/api/chat`, {
            query: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        return this.socket
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }

    sendMessage(message: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('message', message)
        } else {
            console.error('Socket not connected')
        }
    }

    onMessage(callback: (data: ChatMessage) => void): void {
        if (this.socket) {
            this.socket.on('message', callback)
        }
    }

    offMessage(callback?: (data: ChatMessage) => void): void {
        if (this.socket) {
            this.socket.off('message', callback)
        }
    }

    onConnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('connect', callback)
        }
    }

    onDisconnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('disconnect', callback)
        }
    }

    onError(callback: (error: any) => void): void {
        if (this.socket) {
            this.socket.on('error', callback)
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false
    }
}

export const chatService = new ChatService()