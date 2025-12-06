import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

class EncryptionService {
    private getEncryptionKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) throw new Error('ENCRYPTION_KEY not set');

        const keyBuffer = Buffer.from(key, 'base64');
        if (keyBuffer.length !== KEY_LENGTH) {
            throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`);
        }

        return keyBuffer;
    }

    encrypt(text: string): { encrypted: string; iv: string; tag: string } {
        const iv = crypto.randomBytes(16);
        const key = this.getEncryptionKey();

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
        };
    }

    private decrypt(encrypted: string, iv: string, tag: string): string {
        const key = this.getEncryptionKey();

        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    decryptField(encryptedData: any): string | null {
        if (!encryptedData) return null;
        const { encrypted, iv, tag } = encryptedData;
        return this.decrypt(encrypted, iv, tag);
    }
}

export const encryptionService = new EncryptionService();
