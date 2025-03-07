// src/functions/importFileParser/index.test.ts
import { handler } from '../importFileParser';

describe('importFileParser', () => {
    it('should process S3 event', async () => {
        const mockEvent = {
            Records: [
                {
                    s3: {
                        bucket: {
                            name: 'test-bucket',
                        },
                        object: {
                            key: 'uploaded/test.csv',
                        },
                    },
                },
            ],
        };
        
        await expect(handler(mockEvent as any)).resolves.not.toThrow();
    });
});
