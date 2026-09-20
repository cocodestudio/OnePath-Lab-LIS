/**
 * ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE (DUAL MODE: TCP/IP + RS-232 SERIAL CABLE)
 * Connects Pathology Analyzers (Aveacon, Nihon Kohden, Beacon, Mindray, Sysmex, Erba)
 * to OnePath Cloud LIS (api.onepathlab.com)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ================= CONFIGURATION =================
const TCP_PORT = process.env.PORT || 8080;
const COM_PORT = process.env.COM_PORT || ''; // e.g., 'COM1', 'COM3', '/dev/ttyUSB0'
const BAUD_RATE = parseInt(process.env.BAUD_RATE || '9600', 10);
const LIS_API_URL = process.env.LIS_API_URL || 'https://api.onepathlab.com/api/lis/instruments/webhook';
const AUTH_TOKEN = process.env.LIS_TOKEN || ''; // Optional LIS Bearer Token or API Key

console.log('================================================================');
console.log('   🔬 ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE RECEIVER        ');
console.log('   Mode 1: LAN / TCP-IP Socket Listening on Port: ' + TCP_PORT);
console.log('   Mode 2: Serial RS-232 Cable: ' + (COM_PORT ? `${COM_PORT} @ ${BAUD_RATE} baud` : 'Auto / Ready'));
console.log('   Target Cloud LIS: ' + LIS_API_URL);
console.log('================================================================\n');

// ── 1. TCP/IP Server (For Aveacon, Beacon, Mindray, Sysmex LAN) ───────────────
const server = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n[🔌 LAN CONNECTED] Machine connected from ${clientAddress}`);

    let buffer = '';

    socket.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        buffer += text;
        console.log(`[📥 LAN DATA] Received ${chunk.length} bytes from machine.`);

        // Send ASTM / HL7 ACK handshake (\x06 = ACK)
        socket.write(Buffer.from([0x06]));

        // Check if transmission is complete (ETX = \x03, EOT = \x04, or complete message)
        if (text.includes('\x04') || text.includes('\x03') || text.includes('L|1|N') || buffer.length > 250) {
            parseAndSendToCloud(buffer, 'TCP/IP (LAN)');
            buffer = '';
        }
    });

    socket.on('error', (err) => {
        console.error(`[❌ LAN SOCKET ERROR]`, err.message);
    });

    socket.on('close', () => {
        if (buffer.trim()) {
            parseAndSendToCloud(buffer, 'TCP/IP (LAN)');
            buffer = '';
        }
        console.log(`[🔌 LAN DISCONNECTED] Machine disconnected from ${clientAddress}`);
    });
});

server.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`[✅ TCP READY] Local LAN Server is ACTIVE on 0.0.0.0:${TCP_PORT}`);
    console.log(`[👉 LAN Setup]: In Aveacon/Mindray Screen:`);
    console.log(`   - LIS IP: Enter this PC's IPv4 Address`);
    console.log(`   - Port: ${TCP_PORT}`);
    console.log(`   - Transmission Mode: Check [x] Auto Communication\n`);
});

// ── 2. RS-232 Serial Cable Listener (For Nihon Kohden, Erba, Sysmex DB9/USB) ──
function initSerialPort() {
    try {
        const { SerialPort } = require('serialport');
        const { ReadlineParser } = require('@serialport/parser-readline');

        const portToOpen = COM_PORT || 'COM3';
        console.log(`[🔌 SERIAL CABLE] Attempting connection on ${portToOpen} @ ${BAUD_RATE} baud...`);

        const port = new SerialPort({
            path: portToOpen,
            baudRate: BAUD_RATE,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            autoOpen: false,
        });

        port.open((err) => {
            if (err) {
                console.log(`[ℹ️ SERIAL NOTICE] ${portToOpen} not connected or busy (${err.message}). TCP Mode is fully active.`);
                return;
            }
            console.log(`[✅ SERIAL ACTIVE] Connected to Serial Cable on ${portToOpen} @ ${BAUD_RATE} baud!`);
        });

        let serialBuffer = '';

        port.on('data', (chunk) => {
            const text = chunk.toString('utf-8');
            serialBuffer += text;
            console.log(`[📥 SERIAL DATA] Received ${chunk.length} bytes over RS-232.`);

            // Send standard ACK (\x06) back over serial
            port.write(Buffer.from([0x06]));

            if (text.includes('\x04') || text.includes('\x03') || text.includes('L|1|N') || serialBuffer.length > 250) {
                parseAndSendToCloud(serialBuffer, 'RS-232 Serial Cable');
                serialBuffer = '';
            }
        });

        port.on('error', (err) => {
            console.error(`[❌ SERIAL ERROR]`, err.message);
        });

    } catch (e) {
        console.log(`[ℹ️ SERIAL DRIVER] To enable RS-232 Serial Cable mode on this PC, run: npm install serialport`);
    }
}

initSerialPort();

// ── 3. Universal ASTM & HL7 Parser for CBC & Biochemistry ─────────────────────
function parseAndSendToCloud(rawData, connectionType) {
    console.log(`\n[⚙️ PARSING] Processing raw machine packet received via ${connectionType}...`);
    
    let sampleId = 'SMP-' + Math.floor(1000 + Math.random() * 9000);
    let parameters = {};
    let instrumentName = connectionType.includes('Serial') ? 'Nihon Kohden / Serial Analyzer' : 'Aveacon Cell Counter';

    const lines = rawData.split(/\r?\n|\r/);
    
    for (const line of lines) {
        // ASTM Sample Order line: O|1|SAMPLE_ID|...
        if (line.startsWith('O|')) {
            const parts = line.split('|');
            if (parts[2] && parts[2].trim()) {
                sampleId = parts[2].trim().replace(/\^.*$/, '');
            }
        }

        // ASTM Result line: R|1|^^^WBC|7.4|10*3/uL|... or R|1|WBC|7.4|...
        if (line.startsWith('R|')) {
            const parts = line.split('|');
            if (parts.length >= 4) {
                let code = parts[2].replace(/^\^+/, '').trim().toUpperCase();
                let value = parts[3].trim();
                let unit = parts[4] ? parts[4].trim() : '';
                let flag = parts[6] ? parts[6].trim() : 'N';

                if (code && value !== '') {
                    parameters[code] = { value, unit, flag };
                }
            }
        }

        // HL7 OBX Result line: OBX|1|NM|WBC||7.4|10*3/uL|...
        if (line.startsWith('OBX|')) {
            const parts = line.split('|');
            if (parts.length >= 6) {
                let code = parts[3].replace(/\^.*$/, '').trim().toUpperCase();
                let value = parts[5].trim();
                let unit = parts[6] ? parts[6].trim() : '';
                if (code && value !== '') {
                    parameters[code] = { value, unit, flag: 'N' };
                }
            }
        }

        // Key-Value fallback: "WBC: 7.4", "HGB=14.2", "GLU: 95"
        const kvMatch = line.match(/([A-Za-z%#-]{2,10})\s*[:=]\s*([0-9.]+)/);
        if (kvMatch) {
            const code = kvMatch[1].toUpperCase();
            const value = kvMatch[2];
            if (!parameters[code]) {
                parameters[code] = { value, unit: '', flag: 'N' };
            }
        }
    }

    console.log(`[📊 PARSED SAMPLE] ID: ${sampleId} | Parameters: ${Object.keys(parameters).join(', ')}`);

    // Post to OnePath Cloud LIS Webhook
    sendToCloudLIS({
        sample_id: sampleId,
        barcode: sampleId,
        instrument_name: instrumentName,
        category: 'Haematology',
        connection_type: connectionType,
        parameters: parameters,
        raw_data: rawData
    });
}

function sendToCloudLIS(payload) {
    const postData = JSON.stringify(payload);
    const url = new URL(LIS_API_URL);

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
        }
    };

    console.log(`[🚀 FORWARDING] Pushing result to OnePath Cloud (${LIS_API_URL})...`);

    const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`[✨ SUCCESS] Auto-synced with OnePath Cloud LIS! (HTTP ${res.statusCode})\n`);
            } else {
                console.log(`[⚠️ CLOUD RESPONSE ${res.statusCode}]:`, body);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[❌ NETWORK ERROR] Failed to forward to cloud:`, e.message);
    });

    req.write(postData);
    req.end();
}
