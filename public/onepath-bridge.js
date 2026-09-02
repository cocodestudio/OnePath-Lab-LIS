/**
 * ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE
 * Connects Local Pathology Machines (Aveacon, Nihon Kohden, Beacon, Mindray, Sysmex)
 * to OnePath Cloud LIS (api.onepathlab.com)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ================= CONFIGURATION =================
const TCP_PORT = process.env.PORT || 8080;
const LIS_API_URL = process.env.LIS_API_URL || 'https://api.onepathlab.com/api/lis/instruments/ingest';
const AUTH_TOKEN = process.env.LIS_TOKEN || ''; // Put your LIS Bearer Token or API Key here

console.log('====================================================');
console.log('   🔬 ONEPATH LIS - INSTRUMENT BRIDGE RECEIVER      ');
console.log('   Listening for Aveacon & Cell Counters on Port: ' + TCP_PORT);
console.log('   Target Cloud LIS: ' + LIS_API_URL);
console.log('====================================================\n');

// 1. Start Local TCP Server to receive data directly from Aveacon / Mindray / Sysmex
const server = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n[🔌 CONNECTED] Machine connected from ${clientAddress}`);

    let buffer = '';

    socket.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        buffer += text;
        console.log(`[📥 DATA RECEIVED] Received ${chunk.length} bytes from machine.`);

        // Standard ASTM / HL7 ACK response (\x06 = ACK)
        // Aveacon / Mindray expects ACK after receiving data packet
        socket.write(Buffer.from([0x06]));

        // Check if transmission is complete (ETX = \x03, EOT = \x04, or complete message)
        if (text.includes('\x04') || text.includes('\x03') || text.includes('L|1|N') || buffer.length > 300) {
            parseAndSendToCloud(buffer);
            buffer = '';
        }
    });

    socket.on('error', (err) => {
        console.error(`[❌ SOCKET ERROR]`, err.message);
    });

    socket.on('close', () => {
        if (buffer.trim()) {
            parseAndSendToCloud(buffer);
            buffer = '';
        }
        console.log(`[🔌 DISCONNECTED] Machine disconnected from ${clientAddress}`);
    });
});

server.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`[✅ READY] Local Machine Bridge is ACTIVE and listening on 0.0.0.0:${TCP_PORT}`);
    console.log(`[👉 INSTRUCTION] In Aveacon Machine Screen:`);
    console.log(`   - LIS IP: Enter this PC's Local IP Address (e.g. 192.168.x.x)`);
    console.log(`   - Port: ${TCP_PORT}`);
    console.log(`   - Transmission Mode: Check [x] Auto Communication`);
    console.log(`   - Then press SAVE and run a sample!\n`);
});

// 2. Parser for ASTM / HL7 / Raw Text from Aveacon & Cell Counters
function parseAndSendToCloud(rawData) {
    console.log('\n[⚙️ PARSING] Processing raw machine packet...');
    
    let sampleId = 'SMP-' + Math.floor(1000 + Math.random() * 9000);
    let parameters = {};
    let instrumentName = 'Aveacon Cell Counter';

    // Parse ASTM format (Lines with R|... or O|...)
    const lines = rawData.split(/\r?\n|\r/);
    
    for (const line of lines) {
        // Sample ID / Order line: O|1|SAMPLE_ID|...
        if (line.startsWith('O|')) {
            const parts = line.split('|');
            if (parts[2] && parts[2].trim()) {
                sampleId = parts[2].trim().replace(/\^.*$/, '');
            }
        }

        // Result line: R|1|^^^WBC|7.4|10*3/uL|... or R|1|WBC|7.4|...
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

        // HL7 OBX Result line: OBX|1|NM|WBC||7.4|...
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

        // Key-Value fallback: "WBC: 7.4", "HGB=14.2"
        const kvMatch = line.match(/([A-Za-z%#-]{2,10})\s*[:=]\s*([0-9.]+)/);
        if (kvMatch) {
            const code = kvMatch[1].toUpperCase();
            const value = kvMatch[2];
            if (!parameters[code]) {
                parameters[code] = { value, unit: '', flag: 'N' };
            }
        }
    }

    console.log(`[📊 PARSED RESULT] Sample ID: ${sampleId}`);
    console.log(`[📈 PARAMETERS (${Object.keys(parameters).length})]:`, JSON.stringify(parameters));

    // 3. Post to OnePath Cloud LIS
    sendToCloudLIS({
        sample_id: sampleId,
        barcode: sampleId,
        instrument_name: instrumentName,
        category: 'Haematology',
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

    console.log(`[🚀 FORWARDING] Sending result to OnePath Cloud: ${LIS_API_URL}...`);

    const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`[✨ SUCCESS] Synced with OnePath Cloud LIS! (HTTP ${res.statusCode})`);
            } else {
                console.log(`[⚠️ CLOUD RESPONSE ${res.statusCode}]:`, body);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[❌ NETWORK ERROR] Failed to connect to OnePath Cloud:`, e.message);
    });

    req.write(postData);
    req.end();
}
