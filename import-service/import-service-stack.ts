// lib/import-service-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import {LambdaDestination} from 'aws-cdk-lib/aws-s3-notifications';
import * as custom from 'aws-cdk-lib/custom-resources';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        // Import the queue URL from the Product service stack
        const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');
        const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
        
        
        // Reference existing S3 bucket
        const importBucket = s3.Bucket.fromBucketName(
            this,
            'ImportBucket',
            'import-service-aydovnar'
        );
        
        // Create Custom Resource to set CORS
        new custom.AwsCustomResource(this, 'SetBucketCors', {
            onCreate: {
                service: 'S3',
                action: 'putBucketCors',
                parameters: {
                    Bucket: importBucket.bucketName,
                    CORSConfiguration: {
                        CORSRules: [
                            {
                                AllowedHeaders: ['*'],
                                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                                AllowedOrigins: ['https://d2kdejvzt251g9.cloudfront.net'],
                                ExposeHeaders: ['ETag'],
                                MaxAgeSeconds: 3600
                            }
                        ]
                    }
                },
                physicalResourceId: custom.PhysicalResourceId.of('BucketCorsConfig')
            },
            policy: custom.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['s3:PutBucketCors'],
                    resources: [importBucket.bucketArn]
                })
            ])
        });
        
        // Create Lambda Function
        const importProductsFile = new lambda.Function(this, 'ImportProductsFileFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'importProductsFile.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            environment: {
                BUCKET_NAME: importBucket.bucketName,
            },
        });
        
        // Create importFileParser Lambda
        const importFileParser = new lambda.Function(this, 'ImportFileParserFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'importFileParser.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            timeout: cdk.Duration.seconds(30),
            environment: {
                BUCKET_NAME: importBucket.bucketName,
                CATALOG_ITEMS_QUEUE_URL: catalogItemsQueueUrl,
            },
        });
        
        // Add SQS permissions to Lambda
        importFileParser.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sqs:SendMessage'],
            resources: [catalogItemsQueueArn],
        }));
        
        // Grant S3 permissions to importFileParser Lambda
        importFileParser.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:CopyObject',
                's3:DeleteObject',
                's3:PutObject'
            ],
            resources: [
                `${importBucket.bucketArn}/uploaded/*`,
                `${importBucket.bucketArn}/parsed/*`
            ],
        }));
        
        // Add S3 notification for the uploaded folder
        const notification = new LambdaDestination(importFileParser);
        
        // Add notification configuration to the bucket
        importBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            notification,
            { prefix: 'uploaded/' }
        );
        
        // Update permissions to allow PutObject
        importProductsFile.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:PutObjectAcl'
            ],
            resources: [
                `${importBucket.bucketArn}/uploaded/*`,
            ],
        }));
        
        // Create API Gateway
        const api = new apigateway.RestApi(this, 'ImportApi', {
            restApiName: 'Import Service',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
                allowCredentials: true
            }
        });
        
        // Create API Gateway Resource and Method
        const importResource = api.root.addResource('import');
        importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFile, {
            proxy: true,
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }]
        }), {
            requestParameters: {
                'method.request.querystring.name': true,
            },
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                }
            }],
            requestValidatorOptions: {
                validateRequestParameters: true,
            }
        });
        
        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL for import service',
        });
    }
}

