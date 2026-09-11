import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decryptCredential, encryptCredential, hmacHex, sha256Hex, timingSafeEqual } from "../_shared/integrationCrypto.ts";

Deno.test("encrypts and decrypts credentials without storing plaintext", async () => {
  const plaintext = "sfk_example-sensitive-value";
  const encrypted = await encryptCredential(plaintext, "test-encryption-key-with-enough-entropy");

  assertNotEquals(encrypted, plaintext);
  assertEquals(encrypted.startsWith("v1:"), true);
  assertEquals(await decryptCredential(encrypted, "test-encryption-key-with-enough-entropy"), plaintext);
});

Deno.test("hashes tokens and compares HMAC signatures", async () => {
  const firstHash = await sha256Hex("sfk_token");
  const secondHash = await sha256Hex("sfk_token");
  const signature = await hmacHex("secret", '{"teste":true}');

  assertEquals(firstHash, secondHash);
  assertEquals(timingSafeEqual(signature, signature), true);
  assertEquals(timingSafeEqual(signature, `${signature.slice(0, -1)}0`), false);
});