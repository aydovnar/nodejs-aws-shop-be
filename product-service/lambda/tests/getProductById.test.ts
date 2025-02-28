import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../getProductById';
import { products } from '../products';

describe('getProductsById Lambda', () => {
    it('Should return the product if it exists', async () => {
        const product = products[0];
        const event = { pathParameters: { productId: product.id } } as unknown as APIGatewayProxyEvent;
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(result.headers!['Content-Type']).toBe('application/json');
        const body = JSON.parse(result.body);
        expect(body.id).toBe(product.id);
    });
    
    it('Should return the 404 error when product not found', async () => {
        const event = { pathParameters: { productId: 'invalidId' } } as unknown as APIGatewayProxyEvent;
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Product not found');
    });
});
