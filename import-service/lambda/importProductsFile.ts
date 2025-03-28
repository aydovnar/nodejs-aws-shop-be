// lambda/importProductsFile.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.BUCKET_NAME || '';
const s3Client = new S3Client({ region: 'eu-central-1' });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const fileName = event.queryStringParameters?.name;
        
        if (!fileName) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: 'File name is required' })
            };
        }
        
        if (!fileName.toLowerCase().endsWith('.csv')) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: 'Only CSV files are allowed' })
            };
        }
        
        const key = `uploaded/${fileName}`;
        
        // Create PutObject command with specific parameters
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: 'text/csv',
        });
        
        // Generate signed URL with specific options
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
            signingRegion: 'eu-central-1',
            signableHeaders: new Set(['host']),
        });
        
        console.log(`Generated signed URL for ${key} in bucket ${BUCKET_NAME}`);
        
        // Create empty file in S3 to reserve the path
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: '', // Empty file
            ContentType: 'text/csv',
        }));
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://d2kdejvzt251g9.cloudfront.net',
                'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,X-Amz-Security-Token,Authorization,X-Api-Key,X-Requested-With,Accept,Access-Control-Allow-Methods,Access-Control-Allow-Origin,Access-Control-Allow-Headers',
                'Access-Control-Expose-Headers': 'ETag'
            },
            body: signedUrl
        };
        
    } catch (error: unknown) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        };
    }
};
