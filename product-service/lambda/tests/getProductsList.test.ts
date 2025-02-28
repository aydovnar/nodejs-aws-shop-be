import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../getProductsList';

describe('getProductsList Lambda', () => {
    it('should return a list of products with status 200', async () => {
        const event = {} as APIGatewayProxyEvent; // minimal event stub
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(result.headers!['Content-Type']).toBe('application/json'); // non-null assertion
        const body = JSON.parse(result.body);
        expect(Array.isArray(body)).toBe(true);
    });
});
