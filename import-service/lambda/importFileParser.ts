// src/functions/importFileParser/index.ts
import { S3Event } from 'aws-lambda';
import {S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import {S3} from 'aws-sdk';

const s3Client = new S3Client({ region: 'eu-central-1' });

export const handler = async (event: S3Event) => {
    const s3 = new S3();
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    
    console.log(`Processing file ${key} from bucket ${bucket}`);
    
    const getObjectParams = {
        Bucket: bucket,
        Key: key
    };
    
    try {
        return new Promise((resolve, reject) => {
            const s3Stream = s3.getObject(getObjectParams).createReadStream();
            
            csvParser().on('data', (data: any) => {
                console.log('Record:', data);
            });
            
            csvParser().on('end', () => {
                console.log('CSV file successfully processed');
                resolve("");
            });
            
            csvParser().on('error', (error: Error) => {
                console.error('Error parsing CSV:', error);
                reject(error);
            });
            
            s3Stream.pipe(csvParser());
        });
        // After successful processing, move file to parsed folder
        const fileName = key.split('/').pop(); // Get filename
        const destinationKey = `parsed/${fileName}`;
        
        // Copy to parsed folder
        await s3Client.send(new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${key}`,
            Key: destinationKey
        }));
        
        console.log(`Copied file to ${destinationKey}`);
        
        // Delete from uploaded folder
        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
        
        console.log(`Deleted file from ${key}`);
        console.log('Successfully processed and moved the CSV file');
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'File successfully processed and moved' })
        };
        
    } catch (error) {
        console.error('Error processing S3 event:', error);
        throw error;
    }
};
