// Calculate EXACT byte size of the payload for a 51.4MB EPUB
const fileSize = 51.4 * 1024 * 1024;
// Base64 encoding inflates the exact byte size by exactly 4/3
const base64Size = Math.ceil(fileSize * 4 / 3);

// The JSON wrapper size
const jsonOverhead = '{"content":"","encoding":"base64"}'.length;

const totalPayload = base64Size + jsonOverhead;

console.log("Original file size: " + (fileSize / 1024 / 1024).toFixed(2) + " MB");
console.log("Base64 string size: " + (base64Size / 1024 / 1024).toFixed(2) + " MB");
console.log("Total API request payload size: " + (totalPayload / 1024 / 1024).toFixed(2) + " MB");
