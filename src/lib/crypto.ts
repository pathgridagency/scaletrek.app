import { useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';

const SECRET_KEY_STORE = 'scaletrek_x25519_secret';
const PUBLIC_KEY_STORE = 'scaletrek_x25519_public';

const b64 = {
  encode: (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64'),
  decode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64')),
};

export interface NaclKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncodedKeyPair {
  publicKey: string;
  secretKey: string;
}

let cached: NaclKeyPair | null = null;
let encodedCache: EncodedKeyPair | null = null;
let bootstrapPromise: Promise<EncodedKeyPair> | null = null;

const setCache = (kp: NaclKeyPair) => {
  cached = kp;
  encodedCache = {
    publicKey: b64.encode(kp.publicKey),
    secretKey: b64.encode(kp.secretKey),
  };
};

export const generateKeyPair = (): EncodedKeyPair => {
  const kp = nacl.box.keyPair();
  return {
    publicKey: b64.encode(kp.publicKey),
    secretKey: b64.encode(kp.secretKey),
  };
};

const writeKeyPair = async (kp: EncodedKeyPair): Promise<void> => {
  await Promise.all([
    SecureStore.setItemAsync(SECRET_KEY_STORE, kp.secretKey),
    SecureStore.setItemAsync(PUBLIC_KEY_STORE, kp.publicKey),
  ]);
};

export const ensureKeyPair = async (): Promise<EncodedKeyPair> => {
  if (encodedCache) return encodedCache;
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const [storedSecret, storedPublic] = await Promise.all([
      SecureStore.getItemAsync(SECRET_KEY_STORE),
      SecureStore.getItemAsync(PUBLIC_KEY_STORE),
    ]);
    if (storedSecret && storedPublic) {
      try {
        const secretBytes = b64.decode(storedSecret);
        const publicBytes = b64.decode(storedPublic);
        if (secretBytes.length === nacl.box.secretKeyLength && publicBytes.length === nacl.box.publicKeyLength) {
          setCache({ publicKey: publicBytes, secretKey: secretBytes });
          return encodedCache!;
        }
      } catch {}
    }
    const kp = nacl.box.keyPair();
    setCache(kp);
    await writeKeyPair(encodedCache!);
    return encodedCache!;
  })();
  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
};

export const getMyPublicKey = (): string | null => encodedCache?.publicKey ?? null;

export const getMyKeyPairBytes = (): NaclKeyPair | null => cached;

// Precompute the shared key once per peer so per-message encrypt/decrypt stays
// fully synchronous. `nacl.box.before` is curve25519 ECDH → 32-byte shared key.
export const deriveSharedSecret = (peerPublicKeyB64: string): string => {
  if (!cached) {
    throw new Error('crypto: keypair not initialized — call ensureKeyPair() first');
  }
  const peerPub = b64.decode(peerPublicKeyB64);
  if (peerPub.length !== nacl.box.publicKeyLength) {
    throw new Error('crypto: invalid peer public key length');
  }
  const shared = nacl.box.before(peerPub, cached.secretKey);
  return b64.encode(shared);
};

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

export const encryptWithSharedSecret = (
  sharedSecretB64: string,
  plaintext: string,
): EncryptedPayload => {
  const shared = b64.decode(sharedSecretB64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msg = new Uint8Array(Buffer.from(plaintext, 'utf8'));
  const ct = nacl.box.after(msg, nonce, shared);
  return { ciphertext: b64.encode(ct), nonce: b64.encode(nonce) };
};

export const decryptWithSharedSecret = (
  sharedSecretB64: string,
  ciphertextB64: string,
  nonceB64: string,
): string | null => {
  try {
    const shared = b64.decode(sharedSecretB64);
    const nonce = b64.decode(nonceB64);
    const ct = b64.decode(ciphertextB64);
    const plain = nacl.box.open.after(ct, nonce, shared);
    if (!plain) return null;
    return Buffer.from(plain).toString('utf8');
  } catch {
    return null;
  }
};

// Mounted once near the app root. Bootstraps the local keypair, pushes the
// public half into the auth store (which mirrors to Supabase profiles.public_key
// via the auth integration) so peers can encrypt to us.
export const useCryptoBootstrap = () => {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const run = async () => {
      try {
        const kp = await ensureKeyPair();
        const { user, updateUser } = useAuthStore.getState();
        if (user && user.publicKey !== kp.publicKey) {
          updateUser({ publicKey: kp.publicKey });
        }
      } catch {
        didRun.current = false; // allow retry on next mount
      }
    };

    run();

    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.user && state.user.id !== prev.user?.id) {
        const pub = getMyPublicKey();
        if (pub && state.user.publicKey !== pub) {
          state.updateUser({ publicKey: pub });
        }
      }
    });

    return () => unsub();
  }, []);
};
