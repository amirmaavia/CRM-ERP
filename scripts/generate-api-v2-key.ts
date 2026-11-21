import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
// Refuse to overwrite an existing private key. Keep this file out of source control.
writeFileSync("api-v2-private.pem", privateKey.export({ type: "pkcs8", format: "pem" }), { flag: "wx", mode: 0o600 });
console.log("Created api-v2-private.pem. Set API_V2_PRIVATE_KEY in your server environment; never use a NEXT_PUBLIC_ prefix.");
