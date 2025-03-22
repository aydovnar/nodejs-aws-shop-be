// authorization-service/lib/authorization-service-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
    public readonly basicAuthorizer: lambda.Function;
    
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        const username = process.env.GITHUB_USERNAME;
        const password = process.env.GITHUB_PASSWORD;
        
        if (!username || !password) {
            throw new Error('GITHUB_USERNAME and GITHUB_PASSWORD must be provided in environment variables');
        }
        
        // Create environment variables object
        const environmentVars: { [key: string]: string } = {};
        environmentVars[username] = password;
        
        this.basicAuthorizer = new lambda.Function(this, 'basicAuthorizerFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'basicAuthorizer.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            environment: {
                [username]: password,
            }
        });
        
        // Add permissions for the Lambda to be invoked by API Gateway
        this.basicAuthorizer.addPermission('ApiGatewayInvokePermission', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction'
        });
        
        // Output the Lambda ARN for reference
        new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
            value: this.basicAuthorizer.functionArn,
            description: 'Basic Authorizer Lambda Function ARN',
            exportName: 'BasicAuthorizerArn'
        });
    }
}
