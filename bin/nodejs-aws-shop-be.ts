#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {ProductServiceStack} from '../product-service/product-service-stack';

const app = new cdk.App();
new ProductServiceStack(app, 'ProductServiceStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'eu-central-1',
    },
});
