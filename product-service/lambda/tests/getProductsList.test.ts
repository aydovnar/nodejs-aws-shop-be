// product-service/lambda/tests/getProductsList.test.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Callback } from 'aws-lambda';
import { handler } from '../getProductsList';
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getProductsList Lambda', () => {
    beforeEach(() => {
        ddbMock.reset();
    });
    
    const mockContext: Context = {
        callbackWaitsForEmptyEventLoop: true,
        functionName: '',
        functionVersion: '',
        invokedFunctionArn: '',
        memoryLimitInMB: '',
        awsRequestId: '',
        logGroupName: '',
        logStreamName: '',
        getRemainingTimeInMillis: () => 0,
        done: () => {},
        fail: () => {},
        succeed: () => {},
    };
    
    const mockCallback: Callback = () => {};
    
    it('Should return products with stocks', async () => {
        ddbMock
        .on(ScanCommand, { TableName: 'products' })
        .resolves({
            Items: [
                {
                    id: '1',
                    title: 'Product 1',
                    description: 'Description 1',
                    price: 100
                },
                {
                    id: '2',
                    title: 'Product 2',
                    description: 'Description 2',
                    price: 200
                }
            ]
        })
        .on(ScanCommand, { TableName: 'stocks' })
        .resolves({
            Items: [
                { product_id: '1', count: 5 },
                { product_id: '2', count: 10 }
            ]
        });
        
        const event = {} as APIGatewayProxyEvent;
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual([
            {
                id: '1',
                title: 'Product 1',
                description: 'Description 1',
                price: 100,
                count: 5
            },
            {
                id: '2',
                title: 'Product 2',
                description: 'Description 2',
                price: 200,
                count: 10
            }
        ]);
    });
    
    it('Should return empty array when no products exist', async () => {
        ddbMock
        .on(ScanCommand, { TableName: 'products' })
        .resolves({ Items: [] })
        .on(ScanCommand, { TableName: 'stocks' })
        .resolves({ Items: [] });
        
        const event = {} as APIGatewayProxyEvent;
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual([]);
    });
    
    it('Should handle DynamoDB errors gracefully', async () => {
        ddbMock
        .on(ScanCommand)
        .rejects(new Error('DynamoDB error'));
        
        const event = {} as APIGatewayProxyEvent;
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal server error');
    });
    
    it('Should return products with 0 count when no stocks exist', async () => {
        ddbMock
        .on(ScanCommand, { TableName: 'products' })
        .resolves({
            Items: [
                {
                    id: '1',
                    title: 'Product 1',
                    description: 'Description 1',
                    price: 100
                }
            ]
        })
        .on(ScanCommand, { TableName: 'stocks' })
        .resolves({ Items: [] });
        
        const event = {} as APIGatewayProxyEvent;
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual([
            {
                id: '1',
                title: 'Product 1',
                description: 'Description 1',
                price: 100,
                count: 0
            }
        ]);
    });
});
