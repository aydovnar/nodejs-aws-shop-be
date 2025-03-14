import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
const dynamoClient = new DynamoDBClient({});
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;
const STOCKS_TABLE = process.env.STOCKS_TABLE!;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;

interface ProductData {
    id: string
    title: string;
    description: string;
    price: number;
    count: number;
}

const isValidProduct = (product: any): product is ProductData => {
    return (
        typeof product === 'object' && typeof product.id === 'string' && product.id.length > 0 &&
        typeof product.title === 'string' && product.title.length > 0 &&
        typeof product.description === 'string' && product.description.length > 0 &&
        !isNaN(Number(product.price)) && Number(product.price) > 0 &&
        !isNaN(Number(product.count)) && Number(product.count) >= 0
    );
};

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        for (const record of event.Records) {
            const productData = JSON.parse(record.body);
            
            // Validate the product data
            if (!isValidProduct(productData)) {
                console.error('Invalid product data:', productData);
                throw new Error(`Invalid product data: ${JSON.stringify(productData)}`);
            }
            
            // Create the product with validated data
            const item = {
                id: productData.id,
                title: productData.title.trim(),
                description: productData.description.trim(),
                price: productData.price,
            };
            
            // Create the product with validated data
            const stockItem = {
                product_id: productData.id,
                count: productData.count
            };
            
            console.log('Putting item into DynamoDB Product table:', JSON.stringify(item, null, 2));
            
            // Put the item into DynamoDB
            await dynamoDocClient.send(new PutCommand({
                TableName: PRODUCTS_TABLE,
                Item: item
            }));
            
            console.log('Putting item into DynamoDB stocks table:', JSON.stringify(stockItem, null, 2));
            
            await dynamoDocClient.send(new PutCommand({
                TableName: STOCKS_TABLE,
                Item: stockItem
            }));
            
            console.log(`Successfully created product with id: ${item.id}`);
            
            // Send SNS notification
            await snsClient.send(new PublishCommand({
                TopicArn: SNS_TOPIC_ARN,
                Subject: 'New Product Created',
                Message: JSON.stringify({
                    message: `Successfully created product: ${item.title}`,
                    product: item
                }),
                MessageAttributes: {
                    price: {
                        DataType: 'Number',
                        StringValue: item.price.toString()
                    }
                }
            }));
            
            console.log('Successfully sent SNS notification');
        }
        
        console.log(`Successfully processed ${event.Records.length} products`);
        
    } catch (error) {
        console.error('Error processing messages:', error);
        
        await snsClient.send(new PublishCommand({
            TopicArn: SNS_TOPIC_ARN,
            Subject: 'Error Creating Products',
            Message: JSON.stringify({
                message: 'Error occurred while creating products',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }));
        
        throw error;
    }
};
