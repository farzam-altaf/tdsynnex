// phpass.ts - FINAL CORRECT VERSION
import { crypto } from "https://deno.land/std@0.192.0/crypto/mod.ts";

// WordPress itoa64 character set
const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function checkPassword(password: string, storedHash: string): boolean {
  try {
    console.log("🔍 PHPass Verification Start");
    console.log("Hash:", storedHash);
    console.log("Password length:", password.length);

    // Validate hash format
    if (!storedHash || (!storedHash.startsWith("$P$") && !storedHash.startsWith("$H$"))) {
      console.log("❌ Not a valid WordPress hash format");
      return false;
    }

    // Extract count code (position 3)
    const countCode = storedHash.charAt(3);
    const countIndex = itoa64.indexOf(countCode);
    
    if (countIndex < 7 || countIndex > 30) {
      console.log(`❌ Invalid count code: ${countCode}, index: ${countIndex}`);
      return false;
    }

    // Calculate iterations: 2^countIndex
    const iterations = Math.pow(2, countIndex);
    console.log(`Count code: ${countCode} (index: ${countIndex}), Iterations: ${iterations}`);

    // Extract salt (8 characters from position 4)
    const salt = storedHash.substring(4, 12);
    console.log(`Salt: ${salt}`);

    // First hash: md5(salt + password)
    let hash = md5(salt + password);
    console.log(`Initial hash (first 16 chars): ${hash.substring(0, 16)}...`);

    // Perform iterations: md5(hash + password)
    for (let i = 0; i < iterations; i++) {
      hash = md5(hash + password);
    }

    // Reconstruct full hash
    const reconstructedHash = storedHash.substring(0, 12) + hash;
    
    console.log("=== Comparison ===");
    console.log("Original hash length:", storedHash.length);
    console.log("Reconstructed length:", reconstructedHash.length);
    console.log("Hashes match?", storedHash === reconstructedHash);
    
    // Debug: Show first 32 characters of each
    console.log("Original (first 32):", storedHash.substring(0, 32));
    console.log("Reconstructed (first 32):", reconstructedHash.substring(0, 32));
    
    return storedHash === reconstructedHash;
  } catch (error) {
    console.error("❌ Error in checkPassword:", error);
    return false;
  }
}

// MD5 function
function md5(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = crypto.subtle.digestSync("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}