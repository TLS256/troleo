// node.js / CommonJS initialization
global.RTCPeerConnection = require('wrtc').RTCPeerConnection;
global.RTCSessionDescription = require('wrtc').RTCSessionDescription;
global.RTCIceCandidate = require('wrtc').RTCIceCandidate;

const { Utils, Room } = require("node-haxball")();
const fetch = require('node-fetch');

// --- CONFIGURACIÓN ---
const BOT_NAME = process.env.JOB_ID || "Valentina-BOT";
const BOT_AVATAR = "🐝";
const ROOM_ID = process.env.HAXBALL_ROOM_URL || "31IBNI3w4F0"; // solo el código después de ?c=
const ROOM_PASSWORD = process.env.HAXBALL_ROOM_PASSWORD || null; // null = sin contraseña
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/...";
const MENSAJE = process.env.MENSAJE || "¡Hola a todos!";
const LLAMAR_ADMIN = process.env.LLAMAR_ADMIN || "¡Admin, estoy aquí!";

const MAX_INTENTOS = 10; // máximo reintentos

// --- FUNCIONES ---
async function notifyDiscord(message) {
    if (!DISCORD_WEBHOOK_URL) return;
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }),
        });
    } catch (e) {
        console.error("Error al enviar notificación a Discord:", e);
    }
}

async function startBot() {
    let intentos = 0;

    while (intentos < MAX_INTENTOS) {
        intentos++;
        console.log(`🔁 Intento ${intentos} de ${MAX_INTENTOS}`);

        try {
            console.log("🔑 Generando auth...");
            const [authKey, authObj] = await Utils.generateAuth();

            console.log("🚀 Uniéndose a la sala...");

            Room.join({
                id: ROOM_ID,
                password: ROOM_PASSWORD, // null si no hay password
                authObj
            }, {
                storage: {
                    player_name: BOT_NAME,
                    avatar: BOT_AVATAR,
                    player_auth_key: authKey
                },
                onOpen: async (room) => {
                    console.log(`✅ Bot unido a la sala como ${BOT_NAME}`);
                    await notifyDiscord(`🟢 El bot **${BOT_NAME}** ha entrado a la sala.`);

                    // Mensaje inicial
                    room.sendChat(LLAMAR_ADMIN);

                    // Mensaje automático cada 5 segundos
                    const chatInterval = setInterval(() => {
                        try { room.sendChat(MENSAJE); }
                        catch (err) { console.error("Error al enviar mensaje:", err); clearInterval(chatInterval); }
                    }, 5000);

                    // Mensaje a admins cada 10 minutos
                    const adminInterval = setInterval(() => {
                        try { room.sendChat(LLAMAR_ADMIN); }
                        catch (err) { console.error("Error al enviar mensaje a admin:", err); clearInterval(adminInterval); }
                    }, 600000);

                    // Anti-AFK (simulación con chat)
                    const moves = ['left','right','up','down'];
                    let moveIndex = 0;
                    const afkInterval = setInterval(() => {
                        try {
                            const key = moves[moveIndex % moves.length];
                            room.sendChat(`*moviendo ${key}*`);
                            moveIndex++;
                        } catch (err) {
                            console.error("Error anti-AFK:", err);
                            clearInterval(afkInterval);
                        }
                    }, 5000);

                    // Mantener activo 1 hora
                    setTimeout(async () => {
                        clearInterval(chatInterval);
                        clearInterval(adminInterval);
                        clearInterval(afkInterval);
                        await room.leave();
                        await notifyDiscord(`🟡 El bot **${BOT_NAME}** ha terminado su ejecución.`);
                    }, 3600000);
                },
                onClose: async (msg) => {
                    console.log("⚠️ Bot desconectado:", msg?.toString?.() || msg);
                    await notifyDiscord(`🔴 Bot **${BOT_NAME}** desconectado: ${msg?.toString?.() || msg}`);
                    throw new Error("Desconectado de la sala");
                }
            });

            break; // Si entra correctamente, salir del bucle

        } catch (err) {
            console.error(`❌ Intento ${intentos} fallido:`, err.message);
            await notifyDiscord(`🔴 Fallo en intento ${intentos} para el bot **${BOT_NAME}**. Error: ${err.message}`);
            if (intentos >= MAX_INTENTOS) {
                console.error("🚫 Máximo de intentos alcanzado. Abortando.");
                await notifyDiscord(`❌ El bot **${BOT_NAME}** falló tras ${MAX_INTENTOS} intentos.`);
                process.exit(1);
            }
            console.log("⏳ Reintentando en 5 segundos...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// --- INICIAR BOT ---
startBot();
