// lambda/createProduct.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from 'aws-lambda';
import {randomUUID} from 'node:crypto';

const client = new DynamoDBClient({ region: "eu-central-1" });
const docClient = DynamoDBDocumentClient.from(client);

type ProductData = {
    title: string;
    description: string;
    price: number;
    count: number;
};

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Start creating product', event); // Add logging
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Product data is required' }),
            };
        }
        
        const productData: ProductData = JSON.parse(event.body);
        
        // Validate required fields
        if (!productData.title || !productData.description || typeof productData.price !== 'number' || typeof productData.count !== 'number') {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({
                    message: 'Missing required fields. Title, description, price, and count are required'
                }),
            };
        }
        
        const productId = randomUUID();
        console.log('Creating product:', productData);
        console.log('Stock count:', productData.count);
        // Use TransactWriteCommand to ensure both operations succeed or fail together
        await docClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: process.env.PRODUCTS_TABLE,
                        Item: {
                            id: productId,
                            title: productData.title,
                            description: productData.description,
                            price: productData.price,
                        }
                    }
                },
                {
                    Put: {
                        TableName: process.env.STOCKS_TABLE,
                        Item: {
                            product_id: productId,
                            count: productData.count
                        }
                    }
                }
            ]
        }));
        
        return {
            statusCode: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({
                id: productId,
                ...productData
            }),
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
