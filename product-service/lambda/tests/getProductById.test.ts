// product-service/lambda/tests/getProductById.test.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Callback } from 'aws-lambda';
import { handler } from '../getProductById';
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getProductsById Lambda', () => {
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
    
    const createAPIGatewayEvent = (pathParameters: { [name: string]: string } | null = null): APIGatewayProxyEvent => ({
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/products',
        pathParameters: pathParameters,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '',
            apiId: '',
            authorizer: {},
            protocol: 'HTTP/1.1',
            httpMethod: 'GET',
            identity: {
                accessKey: null,
                accountId: null,
                apiKey: null,
                apiKeyId: null,
                caller: null,
                clientCert: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                principalOrgId: null,
                sourceIp: '',
                user: null,
                userAgent: null,
                userArn: null,
            },
            path: '/products',
            stage: '',
            requestId: '',
            requestTimeEpoch: 0,
            resourceId: '',
            resourcePath: '',
        },
        resource: '',
    });
    
    it('Should return the product if it exists', async () => {
        ddbMock
        .on(GetCommand, {
            TableName: 'products',
            Key: { id: '1' }
        })
        .resolves({
            Item: {
                id: '1',
                title: 'Product 1',
                description: 'Description 1',
                price: 100
            }
        })
        .on(GetCommand, {
            TableName: 'stocks',
            Key: { product_id: '1' }
        })
        .resolves({
            Item: {
                product_id: '1',
                count: 5
            }
        });
        
        const event = createAPIGatewayEvent({ productId: '1' });
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual({
            id: '1',
            title: 'Product 1',
            description: 'Description 1',
            price: 100,
            count: 5
        });
    });
    
    it('Should return 404 error when product not found', async () => {
        ddbMock
        .on(GetCommand, {
            TableName: 'products',
            Key: { id: 'invalidId' }
        })
        .resolves({});
        
        const event = createAPIGatewayEvent({ productId: 'invalidId' });
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Product not found');
    });
    
    it('Should return 400 when productId is missing', async () => {
        const event = createAPIGatewayEvent(null);
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Product ID is required');
    });
    
    it('Should return product with count 0 when stock not found', async () => {
        ddbMock
        .on(GetCommand, {
            TableName: 'products',
            Key: { id: '1' }
        })
        .resolves({
            Item: {
                id: '1',
                title: 'Product 1',
                description: 'Description 1',
                price: 100
            }
        })
        .on(GetCommand, {
            TableName: 'stocks',
            Key: { product_id: '1' }
        })
        .resolves({});
        
        const event = createAPIGatewayEvent({ productId: '1' });
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual({
            id: '1',
            title: 'Product 1',
            description: 'Description 1',
            price: 100,
            count: 0
        });
    });
    
    it('Should handle DynamoDB errors gracefully', async () => {
        ddbMock
        .on(GetCommand)
        .rejects(new Error('DynamoDB error'));
        
        const event = createAPIGatewayEvent({ productId: '1' });
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal server error');
    });
    
    it('Should return CORS headers in response', async () => {
        ddbMock
        .on(GetCommand, {
            TableName: 'products',
            Key: { id: '1' }
        })
        .resolves({
            Item: {
                id: '1',
                title: 'Product 1',
                description: 'Description 1',
                price: 100
            }
        })
        .on(GetCommand, {
            TableName: 'stocks',
            Key: { product_id: '1' }
        })
        .resolves({
            Item: {
                product_id: '1',
                count: 5
            }
        });
        
        const event = createAPIGatewayEvent({ productId: '1' });
        
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.headers).toBeDefined();
        expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
        expect(result.headers!['Access-Control-Allow-Credentials']).toBe(true);
    });
});
