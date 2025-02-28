// lambda/tests/createProduct.test.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Callback } from 'aws-lambda';
import { handler } from '../createProduct';
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('createProduct Lambda', () => {
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
    
    const createAPIGatewayEvent = (body: any): APIGatewayProxyEvent => ({
        body: JSON.stringify(body),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/products',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '',
            apiId: '',
            authorizer: {},
            protocol: 'HTTP/1.1',
            httpMethod: 'POST',
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
    
    it('Should create a product successfully', async () => {
        const productData = {
            title: 'Test Product',
            description: 'Test Description',
            price: 100,
            count: 10
        };
        
        ddbMock.on(TransactWriteCommand).resolves({});
        
        const event = createAPIGatewayEvent(productData);
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(201);
        const body = JSON.parse(result.body);
        expect(body).toMatchObject({
            ...productData,
            id: expect.any(String)
        });
    });
    
    it('Should return 400 when body is missing', async () => {
        const event = createAPIGatewayEvent(null);
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Product data is required');
    });
    
    it('Should return 400 when required fields are missing', async () => {
        const productData = {
            title: 'Test Product',
            // missing description, price, and count
        };
        
        const event = createAPIGatewayEvent(productData);
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toContain('Missing required fields');
    });
    
    it('Should handle DynamoDB errors', async () => {
        const productData = {
            title: 'Test Product',
            description: 'Test Description',
            price: 100,
            count: 10
        };
        
        ddbMock.on(TransactWriteCommand).rejects(new Error('DynamoDB error'));
        
        const event = createAPIGatewayEvent(productData);
        const result = await handler(event, mockContext, mockCallback) as APIGatewayProxyResult;
        
        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal server error');
    });
});
