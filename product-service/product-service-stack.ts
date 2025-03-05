import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

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
        
        productsTable.grantReadWriteData(getProductsListFunction);
        productsTable.grantReadWriteData(getProductByIdFunction);
        productsTable.grantWriteData(createProductFunction);
        stocksTable.grantReadWriteData(getProductsListFunction);
        stocksTable.grantReadWriteData(getProductByIdFunction);
        stocksTable.grantWriteData(createProductFunction);
        
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
    }
}
