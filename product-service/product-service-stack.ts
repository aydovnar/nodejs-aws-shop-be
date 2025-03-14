import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Import existing tables instead of creating new ones
        const productsTable = dynamodb.Table.fromTableName(
            this,
            'ImportedProductsTable',
            'products'
        );
        
        const stocksTable = dynamodb.Table.fromTableName(
            this,
            'ImportedStocksTable',
            'stocks'
        );
        
        const environment = {
            PRODUCTS_TABLE: productsTable.tableName,
            STOCKS_TABLE: stocksTable.tableName,
            REGION: 'eu-central-1'
        };
        
        // Create SQS Queue
        const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
            queueName: 'catalogItemsQueue',
            visibilityTimeout: cdk.Duration.seconds(30),
        });
        
        // Create SNS Topic
        const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
            topicName: 'createProductTopic',
        });
        
        // Add email subscription for high-price products (>100)
        createProductTopic.addSubscription(
            new snsSubs.EmailSubscription('artem.dovnar@softteco.com', {
                filterPolicy: {
                    price: sns.SubscriptionFilter.numericFilter({
                        greaterThan: 100
                    })
                }
            })
        );
        
        // Add email subscription for low-price products (<=100)
        createProductTopic.addSubscription(
            new snsSubs.EmailSubscription('artem.dovnar@gmail.com', {
                filterPolicy: {
                    price: sns.SubscriptionFilter.numericFilter({
                        lessThanOrEqualTo: 100
                    })
                }
            })
        );
        
        // Create API Gateway
        const api = new apigateway.RestApi(this, 'ProductsApi', {
            restApiName: 'Products Service',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
                allowCredentials: true
            }
        });
        
        // Create Lambda functions
        const getProductsListFunction = new lambda.Function(this, 'getProductsListFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'getProductsList.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            memorySize: 128,
            timeout: cdk.Duration.seconds(29),
            environment
        });
        
        const getProductByIdFunction = new lambda.Function(this, 'getProductByIdFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'getProductById.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            memorySize: 128,
            timeout: cdk.Duration.seconds(29),
            environment
        });
        
        const createProductFunction = new lambda.Function(this, 'createProductFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'createProduct.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            memorySize: 128,
            timeout: cdk.Duration.seconds(29),
            environment
        });
        
        const catalogBatchProcess = new lambda.Function(this, 'CatalogBatchProcess', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'catalogBatchProcess.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            environment: {
                PRODUCTS_TABLE: productsTable.tableName,
                STOCKS_TABLE: stocksTable.tableName,
                SNS_TOPIC_ARN: createProductTopic.topicArn,
            },
            timeout: cdk.Duration.seconds(30),
        });
        
        // Add SQS as event source for Lambda
        catalogBatchProcess.addEventSource(
            new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
                batchSize: 5,
            })
        );
        
        // Grant permissions to Lambda
        catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
        createProductTopic.grantPublish(catalogBatchProcess);
        
        productsTable.grantReadWriteData(getProductsListFunction);
        productsTable.grantReadWriteData(getProductByIdFunction);
        productsTable.grantWriteData(createProductFunction);
        productsTable.grantWriteData(catalogBatchProcess);
        stocksTable.grantReadWriteData(getProductsListFunction);
        stocksTable.grantReadWriteData(getProductByIdFunction);
        stocksTable.grantWriteData(createProductFunction);
        stocksTable.grantWriteData(catalogBatchProcess);
        
        // Create API Gateway integration
        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListFunction);
        const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdFunction);
        const createProductIntegration = new apigateway.LambdaIntegration(createProductFunction);
        
        
        // Add resource and method
        const products = api.root.addResource('products');
        products.addMethod('GET', getProductsListIntegration);
        products.addMethod('POST', createProductIntegration);
        
        const product = products.addResource('{productId}');
        product.addMethod('GET', getProductByIdIntegration);
        
        
        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });
        
        // Export the queue URL and ARN
        new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
            value: catalogItemsQueue.queueUrl,
            exportName: 'CatalogItemsQueueUrl'
        });
        
        new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
            value: catalogItemsQueue.queueArn,
            exportName: 'CatalogItemsQueueArn'
        });
    }
}
