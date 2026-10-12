import net from 'net';

// Raw HL7 packet from the Aveacon machine captured in previous test run
const hl7Message = 
  "\x0bMSH|^~\\&|||||20261011175614||ORU^R01|0|P|2.3.1||||||UNICODE||\r" +
  "PID|1|||||||\r" +
  "PV1|1||\r" +
  "OBR|1||783||||20261011175558|||||||||||||||||HM||||||||Admin\r" +
  "OBX|1|NM|6690-2^WBC^LN||7.4|10^9/L|4.0-10.0||||F\r" +
  "OBX|2|NM|731-0^Lymph#^LN||2.1|10^9/L|0.8-4.0||||F\r" +
  "OBX|3|NM|10027^Mid#^99MRC||0.6|10^9/L|0.1-1.5||||F\r" +
  "OBX|4|NM|10028^Gran#^99MRC||4.7|10^9/L|2.0-7.0||||F\r" +
  "OBX|5|NM|736-9^Lymph%^LN||28.5|%|20.0-40.0||||F\r" +
  "OBX|6|NM|10029^Mid%^99MRC||8.1|%|3.0-15.0||||F\r" +
  "OBX|7|NM|10030^Gran%^99MRC||63.4|%|50.0-70.0||||F\r" +
  "OBX|8|NM|789-8^RBC^LN||4.85|10^12/L|3.50-5.50||||F\r" +
  "OBX|9|NM|718-7^HGB^LN||142|g/L|110-150||||F\r" +
  "OBX|10|NM|4544-3^HCT^LN||43.5|%|37.0-54.0||||F\r" +
  "OBX|11|NM|787-2^MCV^LN||89.7|fL|80.0-100.0||||F\r" +
  "OBX|12|NM|785-6^MCH^LN||29.3|pg|27.0-34.0||||F\r" +
  "OBX|13|NM|786-4^MCHC^LN||326|g/L|320-360||||F\r" +
  "OBX|14|NM|788-0^RDW-CV^LN||13.2|%|11.0-16.0||||F\r" +
  "OBX|15|NM|21000-5^RDW-SD^LN||42.5|fL|35.0-56.0||||F\r" +
  "OBX|16|NM|777-3^PLT^LN||245|10^9/L|100-300||||F\r" +
  "OBX|17|NM|32623-1^MPV^LN||9.4|fL|6.5-12.0||||F\r" +
  "OBX|18|NM|32207-3^PDW^LN||15.8||15.0-17.0||||F\r" +
  "OBX|19|NM|10002^PCT^99MRC||0.230|%|0.108-0.282||||F\r" +
  "OBX|20|NM|10013^PLCC^99MRC||65|10^9/L|30-90||||F\r" +
  "OBX|21|NM|10014^PLCR^99MRC||26.5|%|11.0-45.0||||F\r" +
  "OBX|37|IS|08002^Blood Mode^99MRC||W||||||F\r" +
  "OBX|38|ST|01001^Remark^99MRC||||||||F\r\x1c\x0d";

const client = new net.Socket();
client.connect(5100, '127.0.0.1', () => {
    console.log('[CLIENT] Connected to port 5100, sending HL7 message...');
    client.write(hl7Message);
});

client.on('data', (data) => {
    console.log('[CLIENT] Received response from bridge:', data.toString('utf-8'));
    client.destroy();
});

client.on('close', () => {
    console.log('[CLIENT] Connection closed.');
});

client.on('error', (err) => {
    console.error('[CLIENT] Socket error:', err.message);
});
