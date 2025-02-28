// lambda/getProductById.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from 'aws-lambda';

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2)); // Add logging
    
    try {
        const productId = event.pathParameters?.productId;
        
        if (!productId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Product ID is required' }),
            };
        }
        
        console.log('Fetching product with ID:', productId); // Add logging
        
        // Get product
        const productResponse = await docClient.send(new GetCommand({
            TableName: process.env.PRODUCTS_TABLE,
            Key: { id: productId },
        }));
        
        console.log('Product response:', JSON.stringify(productResponse, null, 2)); // Add logging
        
        if (!productResponse.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Product not found' }),
            };
        }
        
        // Get stock
        const stockResponse = await docClient.send(new GetCommand({
            TableName: process.env.STOCKS_TABLE,
            Key: { product_id: productId },
        }));
        
        console.log('Stock response:', JSON.stringify(stockResponse, null, 2)); // Add logging
        
        const product = {
            ...productResponse.Item,
            count: stockResponse.Item?.count || 0,
        };
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify(product),
        };
    } catch (error) {
        console.error('Error:', error); // Add error logging
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: 'Internal server error'
            }),
        };
    }
};
