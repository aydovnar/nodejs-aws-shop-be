// authorization-service/src/functions/basicAuthorizer.ts
import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        if (!event.authorizationToken) {
            console.log('No authorization token provided');
            throw new Error('Unauthorized');
        }
        
        const authToken = event.authorizationToken;
        console.log('Auth token received:', authToken);
        
        if (!authToken.toLowerCase().startsWith('basic ')) {
            console.log('Token does not start with Basic');
            throw new Error('Unauthorized');
        }
        
        const base64Credentials = authToken.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        console.log('Decoded credentials:', credentials);
        
        const [username, password] = credentials.split(':');
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('Available environment variables:', Object.keys(process.env));
        console.log('Stored password for user:', process.env[username]);
        
        const storedPassword = process.env[username];
        
        if (!storedPassword || storedPassword !== password) {
            console.log('Password mismatch or user not found');
            return generatePolicy('user', 'Deny', event.methodArn);
        }
        
        console.log('Authentication successful');
        return generatePolicy(username, 'Allow', event.methodArn);
        
    } catch (error) {
        console.error('Error in authorizer:', error);
        throw new Error('Unauthorized');
    }
};

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string) => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        }
    };
};
