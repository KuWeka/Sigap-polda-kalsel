import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Property 4: Password Reset Round-Trip
 *
 * Tests the cryptographic invariants that underpin the password reset flow:
 * 1. SHA-256 hashing is deterministic (same input → same output)
 * 2. SHA-256 hashing produces unique outputs for different inputs
 * 3. After hashing a new password with bcrypt, old password fails and new password succeeds
 * 4. Token generation produces unique tokens
 *
 * **Validates: Requirements 3.2**
 */
describe('Property 4: Password Reset Round-Trip', () => {
  /**
   * Property 4.1: SHA-256 token hashing is deterministic
   * For any random token, hashing it with SHA-256 produces the same result every time.
   * This ensures that when a user submits their reset token, we can reliably
   * compare it against the stored hash.
   */
  it('SHA-256 hashing is deterministic (same input → same output)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        (token: string) => {
          const hash1 = crypto.createHash('sha256').update(token).digest('hex');
          const hash2 = crypto.createHash('sha256').update(token).digest('hex');
          expect(hash1).toBe(hash2);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 4.2: SHA-256 produces different hashes for different tokens
   * For any two different tokens, their SHA-256 hashes must be different.
   * This ensures that reset tokens cannot collide in the database.
   */
  it('SHA-256 produces different hashes for different tokens', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        fc.string({ minLength: 1, maxLength: 128 }),
        (token1: string, token2: string) => {
          fc.pre(token1 !== token2);
          const hash1 = crypto.createHash('sha256').update(token1).digest('hex');
          const hash2 = crypto.createHash('sha256').update(token2).digest('hex');
          expect(hash1).not.toBe(hash2);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 4.3: Password reset round-trip with bcrypt
   * For any old password and new password (where old ≠ new), after hashing
   * the new password with bcrypt:
   * - bcrypt.compare(oldPassword, newHash) returns false
   * - bcrypt.compare(newPassword, newHash) returns true
   *
   * This validates the core invariant of the password reset flow:
   * old credentials stop working and new credentials work.
   */
  it('after bcrypt hashing new password, old password fails and new password succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 32 }),
        fc.string({ minLength: 8, maxLength: 32 }),
        async (oldPassword: string, newPassword: string) => {
          fc.pre(oldPassword !== newPassword);

          // Simulate the password reset: hash the new password with bcrypt
          const newHash = await bcrypt.hash(newPassword, 10);

          // Old password should NOT match the new hash
          const oldMatches = await bcrypt.compare(oldPassword, newHash);
          expect(oldMatches).toBe(false);

          // New password SHOULD match the new hash
          const newMatches = await bcrypt.compare(newPassword, newHash);
          expect(newMatches).toBe(true);
        }
      ),
      { numRuns: 20 } // Lower count due to bcrypt being computationally expensive
    );
  }, 15000);

  /**
   * Property 4.4: Token generation produces unique tokens
   * crypto.randomBytes(32) produces different values on each call.
   * This ensures that each password reset request gets a unique token.
   */
  it('token generation (crypto.randomBytes) produces unique tokens', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        (count: number) => {
          const tokens = new Set<string>();
          for (let i = 0; i < count; i++) {
            tokens.add(crypto.randomBytes(32).toString('hex'));
          }
          // All generated tokens should be unique
          expect(tokens.size).toBe(count);
        }
      ),
      { numRuns: 50 }
    );
  });
});
