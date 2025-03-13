// src/functions/importProductsFile/index.test.ts
import { handler } from '../importProductsFile';

describe('importProductsFile lambda', () => {
    it('should return signed URL when filename is provided', async () => {
        const event = {
            queryStringParameters: {
                name: 'test.csv'
            }
        } as any;
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(result.body).toContain('https://');
    });
    
    it('should return 400 when filename is not provided', async () => {
        const event = {
            queryStringParameters: {}
        } as any;
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(400);
    });
});
