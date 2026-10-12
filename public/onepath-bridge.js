/**
 * ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE (DUAL MODE: TCP/IP + RS-232 SERIAL CABLE)
 * Connects Pathology Analyzers (Aveacon, Nihon Kohden, Beacon, Mindray, Sysmex, Erba)
 * to OnePath Cloud LIS (api.onepathlab.com)
 */

const net = require('net');
const http = require('http');
const https = require('https');

// ================= CONFIGURATION =================
const TCP_PORT = parseInt(process.env.PORT || '5100', 10);
const COM_PORT = process.env.COM_PORT || ''; // e.g., 'COM1', 'COM3', '/dev/ttyUSB0'
const BAUD_RATE = parseInt(process.env.BAUD_RATE || '9600', 10);
const LIS_API_URL = process.env.LIS_API_URL || 'http://127.0.0.1:8000/api/lis/instruments/webhook';
const AUTH_TOKEN = process.env.LIS_TOKEN || ''; // Optional LIS Bearer Token or API Key

console.log('================================================================');
console.log('   🔬 ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE RECEIVER        ');
console.log('   Mode 1: LAN / TCP-IP Socket Listening on Port: ' + TCP_PORT);
console.log('   Mode 2: Serial RS-232 Cable: ' + (COM_PORT ? `${COM_PORT} @ ${BAUD_RATE} baud` : 'Auto / Ready'));
console.log('   Target Local LIS: ' + LIS_API_URL);
console.log('================================================================\n');

// ── 1. TCP/IP Server (For Aveacon, Beacon, Mindray, Sysmex LAN) ───────────────
const server = net.createServer((socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n[🔌 LAN CONNECTED] Machine connected from ${clientAddress}`);

    let buffer = '';

    socket.on('data', (chunk) => {
        const hex = chunk.toString('hex');
        const text = chunk.toString('utf-8');
        buffer += text;

        console.log(`[📥 LAN DATA] Received ${chunk.length} bytes: hex=[${hex}] ascii=[${chunk.toString('ascii').replace(/[\r\n]/g, ' ')}]`);

        // Check ASTM control characters
        // 0x05 = ENQ -> Respond with ACK (0x06)
        if (chunk[0] === 0x05 || chunk.includes(0x05)) {
            console.log(`   [🤝 ASTM ENQ] Received 0x05 (ENQ) -> Replying with 0x06 (ACK)`);
            socket.write(Buffer.from([0x06]));
            return;
        }

        // 2. HL7 MLLP message completion (starts with 0x0B and ends with 0x1C 0x0D)
        const isHl7End = chunk.includes(0x1c) || text.includes('\x1c');
        if (isHl7End && buffer.includes('MSH|')) {
            const mshParts = buffer.split('|');
            const controlId = mshParts[9] || '1';
            const hl7Ack = `\x0bMSH|^~\\&|LIS|ONEPATH|ANALYZER||${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}||ACK|${controlId}|P|2.3.1\rMSA|AA|${controlId}|Success\r\x1c\r`;
            socket.write(hl7Ack);
            socket.write(Buffer.from([0x06])); // also send 0x06 for devices expecting raw ACK
            console.log(`   [✅ HL7 COMPLETE] Full HL7 packet received (${buffer.length} bytes), sent MLLP ACK!`);
            parseAndSendToCloud(buffer, 'HL7 MLLP (LAN)');
            buffer = '';
            return;
        }

        // 3. ASTM frame end handshake (only for ASTM protocols, never during HL7 buffering)
        if (!buffer.includes('MSH|') && (chunk.includes(0x03) || chunk.includes(0x17) || (chunk.length > 5 && (chunk.includes(0x0a) || chunk.includes(0x0d))))) {
            socket.write(Buffer.from([0x06]));
        }

        // ASTM message completion (EOT = 0x04 or terminator record)
        const isAstmEnd = (!buffer.includes('MSH|')) && (chunk.includes(0x04) || text.includes('\x04') || text.includes('L|1|N'));
        if (isAstmEnd && buffer.trim()) {
            socket.write(Buffer.from([0x06]));
            console.log(`   [✅ ASTM COMPLETE] Full ASTM packet received (${buffer.length} bytes), sent ACK!`);
            parseAndSendToCloud(buffer, 'ASTM (LAN)');
            buffer = '';
            return;
        }
    });

    socket.on('error', (err) => {
        console.error(`[❌ LAN SOCKET ERROR]`, err.message);
    });

    socket.on('close', () => {
        if (buffer.trim() && (buffer.includes('MSH|') || buffer.includes('OBR|') || buffer.includes('OBX|') || buffer.includes('R|'))) {
            parseAndSendToCloud(buffer, 'TCP/IP (LAN)');
            buffer = '';
        }
        console.log(`[🔌 LAN DISCONNECTED] Machine disconnected from ${clientAddress}`);
    });
});

server.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`[✅ TCP READY] Local LAN Server is ACTIVE on 0.0.0.0:${TCP_PORT}`);
    console.log(`[👉 LAN Setup]: In Aveacon/Mindray Screen:`);
    console.log(`   - LIS IP: Enter this PC's IPv4 Address (192.168.1.6)`);
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
    let histograms = {};
    let instrumentName = connectionType.includes('Serial') ? 'Nihon Kohden / Serial Analyzer' : 'Aveacon 3-Part Cell Counter';

    const lines = rawData.split(/\r?\n|\r/);
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // HL7 Order line: OBR|1||783||... or OBR|1|783|783|...
        if (trimmedLine.startsWith('OBR|')) {
            const parts = trimmedLine.split('|');
            const obrId = parts[3] || parts[2] || '';
            if (obrId.trim()) {
                sampleId = obrId.trim().replace(/^\^+/, '').replace(/\^.*$/, '');
            }
        }

        // HL7 Patient line: PID|1||1001||...
        if (trimmedLine.startsWith('PID|') && (!sampleId || sampleId.startsWith('SMP-'))) {
            const parts = trimmedLine.split('|');
            const pidId = parts[3] || parts[2] || '';
            if (pidId.trim()) {
                sampleId = pidId.trim().replace(/^\^+/, '').replace(/\^.*$/, '');
            }
        }

        // ASTM Sample Order line: O|1|SAMPLE_ID|... or O|1|1234||^^^CBC...
        if (trimmedLine.startsWith('O|')) {
            const parts = trimmedLine.split('|');
            const rawSid = parts[2] || parts[3] || '';
            if (rawSid.trim()) {
                sampleId = rawSid.trim().replace(/^\^+/, '').replace(/\^.*$/, '');
            }
        }

        // HL7 OBX Result line: OBX|1|NM|6690-2^WBC^LN||7.4|10^9/L|4.0-10.0||||F
        if (trimmedLine.startsWith('OBX|')) {
            const parts = trimmedLine.split('|');
            if (parts.length >= 6) {
                const idTokens = (parts[3] || '').split('^');
                const loinc = (idTokens[0] || '').trim();
                const nameToken = (idTokens[1] || idTokens[0] || '').trim().toUpperCase();

                // Check for encapsulated data (Base64 Histograms)
                if (parts[2] === 'ED' || trimmedLine.includes('Histogram')) {
                    const val = parts[5] || '';
                    const b64Match = val.match(/Base64\^([A-Za-z0-9+/=]+)/i) || val.match(/([A-Za-z0-9+/=]{100,})/);
                    if (b64Match) {
                        const b64Png = 'data:image/png;base64,' + b64Match[1];
                        if (nameToken.includes('WBC') || loinc.includes('15008')) histograms['WBC'] = b64Png;
                        else if (nameToken.includes('RBC') || loinc.includes('15053')) histograms['RBC'] = b64Png;
                        else if (nameToken.includes('PLT') || loinc.includes('15113')) histograms['PLT'] = b64Png;
                    }
                    continue;
                }

                // Skip histogram threshold lines and internal channel markers
                if (nameToken.includes('LINE') || loinc.startsWith('150') || loinc.startsWith('151') || nameToken.includes('HISTOGRAM') || nameToken.includes('BMP')) {
                    continue;
                }

                // Map standard canonical CBC parameters strictly
                let code = '';
                if (loinc === '6690-2' || nameToken === 'WBC' || nameToken === 'TLC' || nameToken === 'WHITE BLOOD CELLS' || nameToken === 'LEUCOCYTES') code = 'WBC';
                else if (loinc === '789-8' || nameToken === 'RBC' || nameToken === 'RED BLOOD CELLS') code = 'RBC';
                else if (loinc === '718-7' || nameToken === 'HGB' || nameToken === 'HB' || nameToken === 'HAEMOGLOBIN' || nameToken === 'HEMOGLOBIN') code = 'HGB';
                else if (loinc === '4544-3' || nameToken === 'HCT' || nameToken === 'PCV') code = 'HCT';
                else if (loinc === '787-2' || nameToken === 'MCV') code = 'MCV';
                else if (loinc === '785-6' || nameToken === 'MCH') code = 'MCH';
                else if (loinc === '786-4' || nameToken === 'MCHC') code = 'MCHC';
                else if (loinc === '777-3' || nameToken === 'PLT' || nameToken === 'PLATELET' || nameToken === 'PLATELETS') code = 'PLT';
                else if (loinc === '788-0' || nameToken === 'RDW-CV' || nameToken === 'RDW_CV') code = 'RDW-CV';
                else if (loinc === '21000-5' || nameToken === 'RDW-SD' || nameToken === 'RDW_SD') code = 'RDW-SD';
                else if (loinc === '736-9' || nameToken === 'LYMPH%' || nameToken === 'LYM%' || nameToken === 'LYM') code = 'LYM%';
                else if (loinc === '10030' || nameToken === 'GRAN%' || nameToken === 'GRA%' || nameToken === 'NEU%' || nameToken === 'NEUT%') code = 'NEU%';
                else if (loinc === '10029' || nameToken === 'MID%' || nameToken === 'MON%' || nameToken === 'MONO%') code = 'MON%';
                else if (loinc === '731-0' || nameToken === 'LYMPH#' || nameToken === 'LYM#') code = 'LYM#';
                else if (loinc === '10028' || nameToken === 'GRAN#' || nameToken === 'GRA#' || nameToken === 'NEU#' || nameToken === 'NEUT#') code = 'NEU#';
                else if (loinc === '10027' || nameToken === 'MID#' || nameToken === 'MON#' || nameToken === 'MONO#') code = 'MON#';
                else if (loinc === '32623-1' || nameToken === 'MPV') code = 'MPV';
                else if (loinc === '32207-3' || nameToken === 'PDW') code = 'PDW';
                else if (loinc === '10002' || nameToken === 'PCT') code = 'PCT';
                else if (loinc === '10013' || nameToken === 'PLCC' || nameToken === 'P-LCC') code = 'P-LCC';
                else if (loinc === '10014' || nameToken === 'PLCR' || nameToken === 'P-LCR') code = 'P-LCR';
                // Map standard Clinical Biochemistry parameters (Avecon Maxlyzer Smart, Beacon, etc.)
                else if (nameToken === 'ALP' || loinc === '6768-6') code = 'ALP';
                else if (nameToken === 'AMY' || loinc === '1798-8') code = 'AMY';
                else if (nameToken === 'BILT' || nameToken === 'TBIL' || nameToken === 'BILI_TOTAL' || loinc === '1975-2') code = 'BILT';
                else if (nameToken === 'BILD' || nameToken === 'DBIL' || nameToken === 'BILI_DIRECT' || loinc === '1968-7') code = 'BILD';
                else if (nameToken === 'CAL' || nameToken === 'CA' || loinc === '17861-6') code = 'CAL';
                else if (nameToken === 'CHOL' || nameToken === 'TCHOL' || loinc === '2093-3') code = 'CHOL';
                else if (nameToken === 'HDLDI' || nameToken === 'HDL' || nameToken === 'HDL-C' || loinc === '2085-9') code = 'HDLdi';
                else if (nameToken === 'LDLDI' || nameToken === 'LDL' || nameToken === 'LDL-C' || loinc === '13457-7') code = 'LDLdi';
                else if (nameToken === 'GLU' || nameToken === 'GLUC' || loinc === '2345-7') code = 'GLU';
                else if (nameToken === 'CREA' || nameToken === 'CREAT' || loinc === '2160-0') code = 'CREAT';
                else if (nameToken === 'UREA' || nameToken === 'BUN' || loinc === '3094-0') code = 'UREA';
                else if (nameToken === 'URIC' || nameToken === 'UA' || loinc === '3084-1') code = 'URIC';
                else if (nameToken === 'SGOT' || nameToken === 'AST' || loinc === '1920-8') code = 'SGOT';
                else if (nameToken === 'SGPT' || nameToken === 'ALT' || loinc === '1742-6') code = 'SGPT';
                else if (nameToken === 'TP' || nameToken === 'PROT' || loinc === '2885-2') code = 'TP';
                else if (nameToken === 'ALB' || loinc === '1751-7') code = 'ALB';
                else if (nameToken === 'GLOB' || loinc === '2336-6') code = 'GLOB';
                else if (nameToken === 'TRIG' || nameToken === 'TG' || loinc === '2571-8') code = 'TRIG';
                else if (nameToken === 'PHOS' || loinc === '2777-1') code = 'PHOS';
                else if (nameToken === 'NA' || loinc === '2951-2') code = 'NA';
                else if (nameToken === 'K' || loinc === '2823-3') code = 'K';
                else if (nameToken === 'CL' || loinc === '2075-0') code = 'CL';
                else if (nameToken) code = nameToken;

                let value = parts[5] ? parts[5].trim() : '';
                let unit = parts[6] ? parts[6].trim() : '';
                let flag = parts[8] ? parts[8].trim() : 'N';

                // Skip non-numeric placeholder markers (e.g. *****)
                if (value === '*****' || value === '----' || value === '---') {
                    value = '';
                }

                // Total Leucocyte Count (WBC / TLC) normalization for Indian pathology standards:
                // Machine sends e.g. 4.6 or 8.6 (10^3/µL). In reports it is 4600 or 8600 (/cumm).
                if (code === 'WBC' && parseFloat(value) > 0 && parseFloat(value) < 100) {
                    value = String(Math.round(parseFloat(value) * 1000));
                    unit = '/cumm';
                }

                // Unit normalization for Indian pathology reporting standards:
                // If Hemoglobin is in g/L and > 30 (e.g. 140 g/L), convert to g/dL (14.0 g/dL)
                if (code === 'HGB' && unit.toLowerCase() === 'g/l' && parseFloat(value) > 30) {
                    value = (parseFloat(value) / 10).toFixed(1);
                    unit = 'g/dL';
                }
                // If MCHC is in g/L and > 100 (e.g. 340 g/L), convert to g/dL (34.0 g/dL)
                if (code === 'MCHC' && unit.toLowerCase() === 'g/l' && parseFloat(value) > 100) {
                    value = (parseFloat(value) / 10).toFixed(1);
                    unit = 'g/dL';
                }

                if (code && value !== '') {
                    parameters[code] = { value, unit, flag };
                }
            }
        }

        // ASTM Result line: R|1|^^^WBC^1|7.4|10*3/uL|... or R|1|WBC|7.4|...
        if (trimmedLine.startsWith('R|')) {
            const parts = trimmedLine.split('|');
            if (parts.length >= 4) {
                let code = parts[2].replace(/^\^+/, '').replace(/\^.*$/, '').trim().toUpperCase();
                let value = parts[3].trim();
                let unit = parts[4] ? parts[4].trim() : '';
                let flag = parts[6] ? parts[6].trim() : 'N';

                if (code && value !== '' && value !== '*****') {
                    if (code === 'WBC' && parseFloat(value) > 0 && parseFloat(value) < 100) {
                        value = String(Math.round(parseFloat(value) * 1000));
                        unit = '/cumm';
                    }
                    parameters[code] = { value, unit, flag };
                    if (code === 'GRAN%' || code === 'GRA%') parameters['NEU%'] = { value, unit, flag };
                    if (code === 'MID%') parameters['MON%'] = { value, unit, flag };
                    if (code === 'GRAN#' || code === 'GRA#') parameters['NEU#'] = { value, unit, flag };
                    if (code === 'MID#') parameters['MON#'] = { value, unit, flag };
                }
            }
        }
    }

    console.log(`[📊 PARSED SAMPLE] ID: ${sampleId} | Parameters: ${Object.keys(parameters).join(', ')}`);
    if (Object.keys(histograms).length > 0) {
        console.log(`   [📈 HISTOGRAMS] Extracted: ${Object.keys(histograms).join(', ')}`);
    }

    const isBiochem = Object.keys(parameters).some(k => ['ALP','AMY','BILT','BILD','CAL','CHOL','HDLDI','GLU','CREAT','UREA','SGOT','SGPT','TP','ALB','TRIG','URIC'].includes(k.toUpperCase()));
    if (isBiochem) {
        instrumentName = 'Avecon Maxlyzer Smart Chemistry';
    }

    // Post to OnePath Local LIS Webhook
    sendToCloudLIS({
        lab_id: '01a05221-6f20-73b4-8107-2e68c7824c90',
        sample_id: sampleId,
        barcode: sampleId,
        instrument_name: instrumentName,
        category: 'Haematology',
        connection_type: connectionType,
        parameters: parameters,
        histograms: histograms,
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
