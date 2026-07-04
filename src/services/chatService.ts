// services/chatService.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
// IMPORTANT: Use this library instead of React Native's built-in WebSocket
// import WebSocket from 'react-native-websocket'

const CHAT_API_URL = 'https://ai.dealnux.shop'
const CHAT_WS_URL = 'wss://ai.dealnux.shop'

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
    sender?: 'user' | 'assistant'   // NEW
}

export interface GuestTokenResponse {
    token: string
    user_id: string
}

class ChatService {
    private socket: any = null
    private token: string | null = null
    private userId: string | null = null
    private isConnecting = false
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private messageListeners: ((data: ChatMessage) => void)[] = []
    private connectListeners: (() => void)[] = []
    private disconnectListeners: (() => void)[] = []
    private errorListeners: ((error: any) => void)[] = []
    private connectErrorListeners: ((error: any) => void)[] = []
    public lastCloseCode: number | null = null
    public lastCloseReason: string = ''

    async getGuestToken(forceRefresh = false): Promise<string> {
        try {
            if (!forceRefresh) {
                const storedToken = await AsyncStorage.getItem('chat_guest_token')
                const storedUserId = await AsyncStorage.getItem('chat_guest_user_id')

                if (storedToken && storedUserId) {
                    this.token = storedToken
                    this.userId = storedUserId
                    console.log('✅ Using stored token')
                    return storedToken
                }
            } else {
                console.log('🔄 Forcing fresh guest token...')
                await AsyncStorage.removeItem('chat_guest_token')
                await AsyncStorage.removeItem('chat_guest_user_id')
            }

            console.log('🔄 Fetching new guest token...')

            const response = await fetch(`${CHAT_API_URL}/api/auth/guest-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to get guest token: ${response.status}`)
            }

            const data: GuestTokenResponse = await response.json()

            if (!data.token) {
                throw new Error('No token received from server')
            }

            this.token = data.token
            this.userId = data.user_id

            await AsyncStorage.setItem('chat_guest_token', data.token)
            await AsyncStorage.setItem('chat_guest_user_id', data.user_id)

            console.log('✅ Guest token obtained successfully')
            return data.token
        } catch (error) {
            console.error('❌ Error getting guest token:', error)
            throw error
        }
    }

    async connect(token: string): Promise<any> {
        if (this.isConnecting) {
            console.log('⏳ Connection already in progress...')
            return new Promise((resolve, reject) => {
                let waited = 0
                const checkInterval = setInterval(() => {
                    waited += 500
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval)
                        resolve(this.socket!)
                    } else if (this.socket?.readyState === WebSocket.CLOSED || !this.isConnecting) {
                        clearInterval(checkInterval)
                        reject(new Error('Connection failed'))
                    } else if (waited >= 15000) {
                        clearInterval(checkInterval)
                        reject(new Error('Connection timeout'))
                    }
                }, 500)
            })
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('🔌 Socket already connected')
            return this.socket
        }

        if (this.socket) {
            this.disconnect()
        }

        console.log('🔌 Connecting to WebSocket...')
        this.isConnecting = true
        this.reconnectAttempts = 0
        this.token = token

        const wsUrl = `${CHAT_WS_URL}/api/chat?token=${encodeURIComponent(token)}`
        console.log(`🔗 Connecting to: ${wsUrl}`)

        return new Promise((resolve, reject) => {
            let settled = false
            let connectionTimeout: ReturnType<typeof setTimeout>

            try {
                // FIX: Use react-native-websocket with headers matching curl
                // @ts-expect-error - RN's WebSocket type defs don't declare the 3rd (options) arg, but it works at runtime
                const socket = new WebSocket(wsUrl, [], {
                    headers: {
                        'User-Agent': 'DealnuxMobileApp/1.0',
                    },
                }) as WebSocket

                this.socket = socket

                connectionTimeout = setTimeout(() => {
                    if (!settled) {
                        settled = true
                        this.isConnecting = false
                        console.log('❌ Connection timeout')
                        try {
                            socket.close()
                        } catch { }
                        reject(new Error('Connection timeout'))
                    }
                }, 15000)

                socket.onopen = () => {
                    clearTimeout(connectionTimeout)
                    console.log('✅ WebSocket connected successfully!')
                    this.isConnecting = false
                    this.reconnectAttempts = 0
                    this.connectListeners.forEach(listener => listener())
                    if (!settled) {
                        settled = true
                        resolve(socket)
                    }
                }

                socket.onmessage = (event: any) => {
                    try {
                        // Handle different message formats
                        let data
                        if (typeof event.data === 'string') {
                            data = JSON.parse(event.data)
                        } else if (event.data instanceof ArrayBuffer) {
                            // Handle binary data if needed
                            const text = new TextDecoder().decode(event.data)
                            data = JSON.parse(text)
                        } else {
                            data = event.data
                        }
                        console.log('📥 Received message:', data)
                        this.messageListeners.forEach(listener => listener(data))
                    } catch (error) {
                        console.log('❌ Failed to parse message:', error, 'Raw data:', event.data)
                    }
                }

                socket.onerror = (error: any) => {
                    console.log('❌ WebSocket error:', error?.message ?? 'no message')
                    this.errorListeners.forEach(listener => listener(error))
                }

                socket.onclose = (event: any) => {
                    console.log('🔌 WebSocket disconnected:', event.code, event.reason)
                    this.isConnecting = false
                    this.lastCloseCode = event.code
                    this.lastCloseReason = event.reason || ''
                    this.disconnectListeners.forEach(listener => listener())

                    if (!settled) {
                        settled = true
                        clearTimeout(connectionTimeout)
                        const reasonText = event.reason || ''
                        const looksLikeAuthRejection =
                            (event.code === 1006 && reasonText.length > 0) ||
                            event.code === 1008 ||
                            /403|forbidden|unauthorized|401/i.test(reasonText)
                        const err = new Error(reasonText || `Socket closed before connecting (code ${event.code})`)
                            ; (err as any).closeCode = event.code
                            ; (err as any).isHandshakeRejection = looksLikeAuthRejection
                        this.connectErrorListeners.forEach(listener => listener(err))
                        reject(err)
                        return
                    }
                }
            } catch (error: any) {
                console.log('❌ Connection error:', error)
                this.isConnecting = false
                reject(error)
            }
        })
    }

    disconnect(): void {
        if (this.socket) {
            console.log('🔌 Disconnecting socket...')
            try {
                this.socket.close(1000, 'Disconnecting')
            } catch (error) {
                console.log('Error closing socket:', error)
            }
            this.socket = null
        }
        this.isConnecting = false
        this.reconnectAttempts = 0
    }

    sendMessage(message: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('📤 Sending message:', message)
            this.socket.send(JSON.stringify({ message }))
        } else {
            console.error('❌ Socket not connected. State:', this.socket?.readyState)
            throw new Error('Socket not connected')
        }
    }

    onMessage(callback: (data: ChatMessage) => void): void {
        this.messageListeners.push(callback)
    }

    onConnect(callback: () => void): void {
        this.connectListeners.push(callback)
    }

    onDisconnect(callback: () => void): void {
        this.disconnectListeners.push(callback)
    }

    onError(callback: (error: any) => void): void {
        this.errorListeners.push(callback)
    }

    onConnectError(callback: (error: any) => void): void {
        this.connectErrorListeners.push(callback)
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN
    }
}

export const chatService = new ChatService()