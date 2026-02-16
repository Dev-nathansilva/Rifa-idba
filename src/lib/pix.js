function onlyAscii(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function formatTLV(id, value) {
  const v = String(value);
  const len = String(v.length).padStart(2, "0");
  return `${id}${len}${v}`;
}

// CRC16/CCITT-FALSE
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitizeTxid(txid) {
  // Muitos bancos aceitam só A-Z0-9 e até 25 chars
  const clean = onlyAscii(txid)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 25);

  if (!clean) return "TXID"; // fallback mínimo (pode trocar)
  return clean;
}

export function generatePixCopyPaste({
  key,
  merchantName,
  merchantCity,
  amount, // "30.00"
  txid,
  description,
}) {
  const name = onlyAscii(merchantName).slice(0, 25);
  const city = onlyAscii(merchantCity).slice(0, 15);
  const idTx = sanitizeTxid(txid);

  // Merchant Account Information (ID 26)
  // 00 = GUI, 01 = Key, 02 = Description (opcional)
  const gui = formatTLV("00", "br.gov.bcb.pix");
  const pixKey = formatTLV("01", onlyAscii(key));
  const desc = description
    ? formatTLV("02", onlyAscii(description).slice(0, 72))
    : "";
  const merchantAccountInfo = formatTLV("26", `${gui}${pixKey}${desc}`);

  const payloadFormatIndicator = formatTLV("00", "01");

  // 11 = estático (mais compatível quando você usa chave pix)
  const pointOfInitiationMethod = formatTLV("01", "11");

  const merchantCategoryCode = formatTLV("52", "0000");
  const transactionCurrency = formatTLV("53", "986"); // BRL
  const transactionAmount = amount ? formatTLV("54", amount) : "";
  const countryCode = formatTLV("58", "BR");
  const merchantNameTlv = formatTLV("59", name);
  const merchantCityTlv = formatTLV("60", city);

  // Additional Data Field Template (ID 62) com TXID (05)
  const additionalData = formatTLV("62", formatTLV("05", idTx));

  // Monta payload e calcula CRC
  const payloadToCrc =
    payloadFormatIndicator +
    pointOfInitiationMethod +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantNameTlv +
    merchantCityTlv +
    additionalData +
    "6304";

  const crc = crc16(payloadToCrc);
  return payloadToCrc + crc;
}
