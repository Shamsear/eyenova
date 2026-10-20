import crypto from 'crypto';

const PEPPER = process.env.EYENOVA_PEPPER_KEY || 'EyeNova_Qatar_POS_2026_SecurePepper_#99';
const ITERATIONS = 100000;
const SALT_SIZE = 16;
const KEY_SIZE = 32;
const PREFIX = 'PBKDF2$';

/**
 * Hashes a plain numeric PIN using peppered PBKDF2-SHA256 matching the desktop POS.
 * Format: PBKDF2$100000$<salt_b64>$<hash_b64>
 */
export function hashPin(plainPin: string): string {
  const cleanPin = (plainPin || '0000').trim();
  const salt = crypto.randomBytes(SALT_SIZE);
  const pepperedBytes = Buffer.from(cleanPin + PEPPER, 'utf8');
  const hash = crypto.pbkdf2Sync(pepperedBytes, salt, ITERATIONS, KEY_SIZE, 'sha256');

  return `${PREFIX}${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verifies an entered PIN against stored database credentials.
 * Supports:
 * 1. Peppered PBKDF2-SHA256 (Desktop POS standard)
 * 2. Unpeppered PBKDF2-SHA256 (Early migration format)
 * 3. Plaintext PINs
 * 4. Master PIN fallback (0000, 1234) for quick staff onboarding
 */
export function verifyPin(inputPin: string, storedCredential?: string | null): boolean {
  if (!inputPin) return false;
  const cleanInput = inputPin.trim();

  // If no stored credential, accept default 0000
  if (!storedCredential) {
    return cleanInput === '0000';
  }

  const cleanStored = storedCredential.trim();

  // 1. Direct plaintext match
  if (cleanInput === cleanStored) {
    return true;
  }

  // 2. Standard PBKDF2 format
  if (cleanStored.startsWith(PREFIX)) {
    try {
      const parts = cleanStored.split('$');
      if (parts.length === 4) {
        const iter = parseInt(parts[1], 10);
        const salt = Buffer.from(parts[2], 'base64');
        const expectedHash = Buffer.from(parts[3], 'base64');

        // Check with Pepper
        const pepperedBytes = Buffer.from(cleanInput + PEPPER, 'utf8');
        const actualHashPeppered = crypto.pbkdf2Sync(pepperedBytes, salt, iter, expectedHash.length, 'sha256');
        if (crypto.timingSafeEqual(actualHashPeppered, expectedHash)) {
          return true;
        }

        // Check without Pepper
        const unpepperedBytes = Buffer.from(cleanInput, 'utf8');
        const actualHashUnpeppered = crypto.pbkdf2Sync(unpepperedBytes, salt, iter, expectedHash.length, 'sha256');
        if (crypto.timingSafeEqual(actualHashUnpeppered, expectedHash)) {
          return true;
        }
      }
    } catch (err) {
      console.error('Error during PBKDF2 comparison:', err);
    }
  }

  // 3. Fallback master PINs (0000, 1234)
  if (cleanInput === '0000' || cleanInput === '1234') {
    return true;
  }

  return false;
}

/**
 * Generate user initials from full name
 */
export function getUserInitials(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return 'OP';
  const parts = fullName.trim().split(/[\s\-_]+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Get human readable role badge
 */
export function getRoleBadge(role?: string | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'STORE_ADMIN':
    case 'ADMIN':
      return 'Store Admin';
    case 'OPTOMETRIST':
      return 'Optometrist';
    case 'STAFF':
    default:
      return 'Staff / Cashier';
  }
}
