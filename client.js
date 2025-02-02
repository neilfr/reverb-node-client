import 'dotenv/config';
import WebSocket from 'ws';

// Construct WebSocket URL
const wsUrl = `${process.env.REVERB_SCHEME}://${process.env.REVERB_HOST}:${process.env.REVERB_PORT}/app/${process.env.REVERB_APP_KEY}`;

console.log(`Connecting to Reverb WebSocket at ${wsUrl}...`);

// Establish WebSocket connection
const socket = new WebSocket(wsUrl);

// When the connection is open
socket.on('open', () => {
    console.log('✅ Connected to Reverb WebSocket server.');

    // Subscribe to the "public_messages" channel
    const subscribePayload = JSON.stringify({
        event: "pusher:subscribe",
        data: {
            channel: "public_messages"
        }
    });

    socket.send(subscribePayload);
    console.log('📡 Subscribed to public_messages channel');
});

// When a message is received
socket.on('message', (data) => {
    try {
        const messageData = JSON.parse(data.toString());
        console.log('📩 Raw Received Event:', messageData);

        if (messageData.event === 'pusher:ping') {
            console.log('🔄 Received ping, sending pong...');
            socket.send(JSON.stringify({ event: "pusher:pong" }));
        } else if (messageData.event === 'message.sent') {
            console.log('📨 New message received:', messageData.data);
        } else {
            console.log('📩 Received other event:', messageData);
        }
    } catch (error) {
        console.error('❌ Error parsing message:', error);
    }
});

// Handle WebSocket errors
socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

// Handle connection closure
socket.on('close', () => {
    console.log('❌ Connection to Reverb closed.');
});