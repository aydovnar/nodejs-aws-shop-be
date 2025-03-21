// catalogBatchProcess.test.ts
import { handler } from '../catalogBatchProcess';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Context, SQSEvent } from 'aws-lambda';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-sns');

describe('catalogBatchProcess', () => {
    const mockDynamoSend = jest.fn();
    const mockSNSSend = jest.fn();
    
    const mockContext: Context = {
        callbackWaitsForEmptyEventLoop: true,
        functionName: 'catalogBatchProcess',
        functionVersion: '1',
        invokedFunctionArn: 'arn:test',
        memoryLimitInMB: '128',
        awsRequestId: '123',
        logGroupName: 'test-group',
        logStreamName: 'test-stream',
        getRemainingTimeInMillis: () => 1000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
    };
    
    beforeEach(() => {
        // Setup environment variables
        process.env.PRODUCTS_TABLE = 'test-products-table';
        process.env.STOCKS_TABLE = 'test-stocks-table';
        process.env.SNS_TOPIC_ARN = 'test-sns-topic';
        
        // Mock DynamoDB
        (DynamoDBClient as jest.Mock).mockImplementation(() => ({}));
        (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
            send: mockDynamoSend
        });
        
        // Mock SNS
        (SNSClient as jest.Mock).mockImplementation(() => ({
            send: mockSNSSend
        }));
        
        // Clear mocks before each test
        jest.clearAllMocks();
    });
    
    const validProduct = {
        id: 'test-id',
        title: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        count: 10
    };
    
    const createSQSEvent = (body: any): SQSEvent => ({
        Records: [
            {
                messageId: '1',
                receiptHandle: 'test-receipt',
                body: JSON.stringify(body),
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1',
                    SenderId: 'test-sender',
                    ApproximateFirstReceiveTimestamp: '1'
                },
                messageAttributes: {},
                md5OfBody: 'test-md5',
                eventSource: 'aws:sqs',
                eventSourceARN: 'test:arn',
                awsRegion: 'eu-central-1'
            }
        ]
    });
    
    it('should throw error for invalid product data', async () => {
        const invalidProduct = {
            id: '', // invalid empty id
            title: 'Test Product',
            description: 'Test Description',
            price: 99.99,
            count: 10
        };
        
        const testEvent = createSQSEvent(invalidProduct);
        
        await expect(handler(testEvent, mockContext, () => {}))
        .rejects.toThrow('Invalid product data');
    });
    
    it('should throw error for invalid JSON in SQS message', async () => {
        const testEvent: SQSEvent = {
            Records: [
                {
                    messageId: '1',
                    receiptHandle: 'test-receipt',
                    body: 'invalid-json',
                    attributes: {
                        ApproximateReceiveCount: '1',
                        SentTimestamp: '1',
                        SenderId: 'test-sender',
                        ApproximateFirstReceiveTimestamp: '1'
                    },
                    messageAttributes: {},
                    md5OfBody: 'test-md5',
                    eventSource: 'aws:sqs',
                    eventSourceARN: 'test:arn',
                    awsRegion: 'eu-central-1'
                }
            ]
        };
        
        await expect(handler(testEvent, mockContext, () => {}))
        .rejects.toThrow('Unexpected token');
    });
    
    it('should validate all product fields', async () => {
        const testCases = [
            { ...validProduct, id: undefined },
            { ...validProduct, title: '' },
            { ...validProduct, description: undefined },
            { ...validProduct, price: 'not-a-number' },
            { ...validProduct, price: -1 },
            { ...validProduct, count: 'not-a-number' },
            { ...validProduct, count: -1 }
        ];
        
        for (const testCase of testCases) {
            const testEvent = createSQSEvent(testCase);
            await expect(handler(testEvent, mockContext, () => {}))
            .rejects.toThrow('Invalid product data');
        }
    });
});
