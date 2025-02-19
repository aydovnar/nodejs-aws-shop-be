import {products} from './products';

export const handler = async (event: any) => {
    try {
        const { productId } = event.pathParameters || {};
        console.log('Received productId:', productId);
        
        if (!productId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                },
                body: JSON.stringify({ message: 'Product ID is required' })
            };
        }
        
        const product = products.find((p) => p.id === productId);
        
        if(!product){
            
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*'
                },
                body: JSON.stringify({ message: 'Product not found' })
            };
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(product, null, 2)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*'
            },
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
