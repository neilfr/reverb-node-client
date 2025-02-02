import 'dotenv/config';
import WebSocket from 'ws';
import axios from 'axios';

// Construct WebSocket URL
const wsUrl = `${process.env.REVERB_SCHEME}://${process.env.REVERB_HOST}:${process.env.REVERB_PORT}/app/${process.env.REVERB_APP_KEY}`;
console.log(`Connecting to Reverb WebSocket at ${wsUrl}...`);

const userId=process.env.USER_ID;
const token=process.env.TOKEN;

let socketId = null;

async function getAuthSignature(channelName, socketId) {
    try {
        // 🔑 Send authentication request to Laravel
        console.log('SENDING POST WITH AUTH TOKEN: ', token)
        const response = await axios.post(
            `${process.env.LARAVEL_HOST}/broadcasting/auth`,
            {
                socket_id: socketId,
                channel_name: channelName
            },
            {
                headers: { Authorization: `Bearer ${token}` } // Send Laravel auth token
            }
        );

        return response.data; // Return authentication response from Laravel
    } catch (error) {
        console.error("❌ Authentication failed:", error.response?.data || error.message);
        return null;
    }
}

async function connectWebSocket() {

    const socket = new WebSocket(wsUrl);

    socket.on('open', ()=> {
        console.log('CONNECTD TO REVERB WEBSOCKET SERVER');
    });

    socket.on('message', async (data) => {
        try {
            const messageData = JSON.parse(data.toString());
            console.log('📩 Received event:', messageData);

            // 🔹 Capture the socket_id when the connection is established
            if (messageData.event === 'pusher:connection_established') {
                socketId = JSON.parse(messageData.data).socket_id;
                console.log(`🔑 Received socket_id: ${socketId}`);

                // 🔐 Authenticate and subscribe to the private channel
                const privateChannel = `private-private_messages.${userId}`;
                const authResponse = await getAuthSignature(privateChannel, socketId);

                if (!authResponse) {
                    console.error("❌ Could not authenticate private channel.");
                    return;
                }

                // Subscribe to the private channel with authentication
                const subscribePayload = JSON.stringify({
                    event: "pusher:subscribe",
                    data: {
                        channel: privateChannel,
                        auth: authResponse.auth
                    }
                });

                socket.send(subscribePayload);
                console.log(`📡 Subscribed to ${privateChannel} channel`);
            }

            if (messageData.event === 'message.sent') {
                console.log('📨 New private message:', messageData.data);
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });

    socket.on('error', (error) => console.error('❌ WebSocket error:', error));
    socket.on('close', () => {
        console.log('❌ Connection closed. Reconnecting in 5 seconds...');
        setTimeout(connectWebSocket, 5000);
    });
}

connectWebSocket();