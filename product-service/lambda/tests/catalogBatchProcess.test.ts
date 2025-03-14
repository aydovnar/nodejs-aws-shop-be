import { Context, SQSEvent, SQSRecord, Callback } from 'aws-lambda';
import { DynamoDB, SNS } from 'aws-sdk';
import { handler } from '../catalogBatchProcess';

// ... mock setup ...

const createMockContext = (): Context => ({
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'catalogBatchProcess',
    functionVersion: '1',
    invokedFunctionArn: 'test:arn',
    memoryLimitInMB: '128',
    awsRequestId: '123',
    logGroupName: 'test-group',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
});

describe('catalogBatchProcess', () => {
    let mockDynamoDBPut: jest.Mock;
    let mockSNSPublish: jest.Mock;
    
    beforeEach(() => {
        // ... mock setup ...
    });
    
    it('should successfully process SQS messages and create products', async () => {
        const testProduct = {
            id: '1',
            title: 'Test Product',
            description: 'Test Description',
            price: 99.99
        };
        
        const testEvent = createSQSEvent([testProduct]);
        const mockContext = createMockContext();
        const mockCallback: Callback = jest.fn();
        
        await handler(testEvent, mockContext, mockCallback);
        
        expect(mockDynamoDBPut).toHaveBeenCalledTimes(1);
        // ... rest of assertions ...
    });
    
    it('should handle database errors and send error notification', async () => {
        const dbError = new Error('Database error');
        mockDynamoDBPut.mockRejectedValue(dbError);
        
        const testEvent = createSQSEvent([
            { id: '1', title: 'Test Product', description: 'Test Description', price: 99.99 }
        ]);
        const mockContext = createMockContext();
        const mockCallback: Callback = jest.fn();
        
        await expect(async () => {
            await handler(testEvent, mockContext, mockCallback);
        }).rejects.toThrow('Database error');
        
        expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
        expect(mockSNSPublish).toHaveBeenCalledWith(
            expect.objectContaining({
                TopicArn: process.env.SNS_TOPIC_ARN,
                Subject: 'Error Creating Products',
                Message: expect.stringContaining('Error occurred while creating products')
            }),
            undefined,
            expect.any(Function)
        );
    });
    
    it('should handle multiple products in batch', async () => {
        const testProducts = [
            { id: '1', title: 'Product 1', description: 'Desc 1', price: 99.99 },
            { id: '2', title: 'Product 2', description: 'Desc 2', price: 149.99 }
        ];
        
        const testEvent = createSQSEvent(testProducts);
        const mockContext = createMockContext();
        const mockCallback: Callback = jest.fn();
        
        await handler(testEvent, mockContext, mockCallback);
        
        expect(mockDynamoDBPut).toHaveBeenCalledTimes(2);
        // ... rest of assertions ...
        
        expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
    });
    
    // Helper function to create SQS event
    const createSQSEvent = (bodies: Record<string, any>[]): SQSEvent => ({
        Records: bodies.map((body, index): SQSRecord => ({
            messageId: index.toString(),
            receiptHandle: `handle-${index}`,
            body: JSON.stringify(body),
            attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890',
                SenderId: 'TESTID',
                ApproximateFirstReceiveTimestamp: '1234567890'
            },
            messageAttributes: {},
            md5OfBody: `test-md5-${index}`,
            eventSource: 'aws:sqs',
            eventSourceARN: 'test:arn',
            awsRegion: 'eu-west-1'
        }))
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.PRODUCTS_TABLE;
        delete process.env.SNS_TOPIC_ARN;
    });
});
