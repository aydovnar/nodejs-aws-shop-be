import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
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
        const getProductsListFunction = new lambda.Function(this, 'GetProductsListFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'getProductsList.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            memorySize: 128,
            timeout: cdk.Duration.seconds(29)
        });
        
        const getProductByIdFunction = new lambda.Function(this, 'getProductByIdFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'getProductById.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            memorySize: 128,
            timeout: cdk.Duration.seconds(29)
        });
        
        // Create API Gateway integration
        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListFunction);
        const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdFunction);
        
        
        // Add resource and method
        const products = api.root.addResource('products');
        products.addMethod('GET', getProductsListIntegration);
        
        const product = products.addResource('{productId}');
        product.addMethod('GET', getProductByIdIntegration);
        
        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });
    }
}
