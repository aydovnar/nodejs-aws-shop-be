// lambda/getProductsList.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from 'aws-lambda';

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Getting all products', event); // Add logging
    
    try {
        // Get all products
        const productsResponse = await docClient.send(new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE,
        }));
        
        console.log('Products response:', JSON.stringify(productsResponse, null, 2)); // Add logging
        
        const products = productsResponse.Items || [];
        
        // Get all stocks
        const stocksResponse = await docClient.send(new ScanCommand({
            TableName: process.env.STOCKS_TABLE,
        }));
        
        console.log('Stocks response:', JSON.stringify(stocksResponse, null, 2)); // Add logging
        
        const stocks = stocksResponse.Items || [];
        
        // Join products with stocks
        const productsWithStocks = products.map(product => ({
            ...product,
            count: stocks.find(stock => stock.product_id === product.id)?.count || 0
        }));
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productsWithStocks),
        };
    } catch (error) {
        console.error('Error:', error); // Add error logging
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: 'Internal server error'
            }),
        };
    }
};
