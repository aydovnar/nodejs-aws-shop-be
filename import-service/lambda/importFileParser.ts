import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: 'eu-central-1' });
const sqsClient = new SQSClient({ region: 'eu-central-1' });

const parseCSV = async (csvContent: string, queueUrl: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.log('No content found in CSV');
        return;
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Process all lines except headers
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        const record: any = {};
        
        headers.forEach((header, index) => {
            record[header] = values[index];
        });
        
        try {
            await sqsClient.send(new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(record)
            }));
        } catch (error) {
            console.error(`Failed to send message to SQS: ${error}`);
        }
    }
};

// Validate environment variables at startup
const QUEUE_URL = process.env.CATALOG_ITEMS_QUEUE_URL;
if (!QUEUE_URL) {
    throw new Error('CATALOG_ITEMS_QUEUE_URL environment variable is not set');
}

export const handler = async (event: S3Event) => {
    
    try {
        for (const record of event.Records) {
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));
            
            const stream = response.Body as Readable;
            let csvContent = '';
            
            for await (const chunk of stream) {
                csvContent += chunk;
            }
            
            await parseCSV(
                csvContent,
                QUEUE_URL
            );
            
            // Move file to parsed folder
            const newKey = key.replace('uploaded', 'parsed');
            await s3Client.send(new CopyObjectCommand({
                Bucket: bucket,
                CopySource: `${bucket}/${key}`,
                Key: newKey
            }));
            
            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key
            }));
            
            console.log(`Successfully processed and moved file ${key} to parsed folder`);
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
};
