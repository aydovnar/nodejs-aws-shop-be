import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: 'eu-central-1' });

const parseCSV = (csvContent: string) => {
    console.log('Raw CSV content:', csvContent); // Debug log
    
    // Split content into lines and filter out empty lines
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log('Lines after split:', lines); // Debug log
    
    if (lines.length === 0) {
        console.log('No content found in CSV');
        return [];
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(header => header.trim());
    console.log('Headers:', headers);
    
    const records = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = line.split(',').map(value => value.trim());
            if (values.length === headers.length) {
                const record: any = {};
                headers.forEach((header, index) => {
                    record[header] = values[index];
                });
                records.push(record);
            }
        }
    }
    
    console.log('Parsed records:', records);
    return records;
};

export const handler = async (event: S3Event) => {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    
    console.log(`Processing file ${key} from bucket ${bucket}`);
    
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: key
        }));
        
        if (!response.Body) {
            throw new Error('Empty response body');
        }
        
        // Read the stream using async/await and Buffer
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        
        const csvContent = Buffer.concat(chunks).toString('utf-8');
        console.log('CSV Content length:', csvContent.length); // Debug log
        console.log('First 100 characters:', csvContent.substring(0, 100)); // Debug log
        
        if (!csvContent.trim()) {
            console.log('CSV content is empty');
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'CSV file is empty',
                })
            };
        }
        
        // Parse CSV content
        const records = parseCSV(csvContent);
        
        if (records.length === 0) {
            console.log('No records found in CSV file');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No records found in CSV file',
                    recordsProcessed: 0
                })
            };
        }
        
        // Move file to parsed folder
        const fileName = key.split('/').pop();
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
        console.log(`Successfully processed ${records.length} records`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'File successfully processed and moved',
                recordsProcessed: records.length,
                records: records
            })
        };
        
    } catch (error: any) {
        console.error('Error processing S3 event:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing CSV file',
                error: error.message
            })
        };
    }
};
