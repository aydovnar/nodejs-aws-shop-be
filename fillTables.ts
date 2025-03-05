import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: 'eu-central-1'
});
const docClient = DynamoDBDocumentClient.from(client);

// Sample product data
const productsData = [
    {
        description: "ProductOne Description",
        price: 24,
        title: "ProductOne",
    },
    {
        description: "ProductTwo Description",
        price: 15,
        title: "ProductTwo",
    },
    {
        description: "ProductThree Description",
        price: 23,
        title: "ProductThree",
    },
    {
        description: "ProductFour Description",
        price: 15,
        title: "ProductFour",
    },
    {
        description: "ProductFive Description",
        price: 23,
        title: "ProductFive",
    },
    {
        description: "ProductSix Description",
        price: 15,
        title: "ProductSix",
    },
    {
        description: "ProductSeven Description",
        price: 18,
        title: "ProductSeven",
    },
    {
        description: "ProductEight Description",
        price: 35,
        title: "ProductEight",
    },
    {
        description: "ProductNine Description",
        price: 95,
        title: "ProductNine",
    },
    {
        description: "ProductTen Description",
        price: 15,
        title: "ProductTen",
    },
];

// Function to generate stock data based on product IDs
const generateStockData = (productIds: string[]) => {
    return productIds.map(productId => ({
        product_id: productId,
        count: Math.floor(Math.random() * 100) + 1 // Random stock between 1 and 100
    }));
};

async function fillTables() {
    try {
        // Generate products with UUIDs
        const products = productsData.map(product => ({
            id: uuidv4(),
            ...product
        }));
        
        // Generate corresponding stock entries
        const stocks = generateStockData(products.map(p => p.id));
        
        // Prepare products batch write items
        const productItems = products.map(product => ({
            PutRequest: {
                Item: product
            }
        }));
        
        // Prepare stocks batch write items
        const stockItems = stocks.map(stock => ({
            PutRequest: {
                Item: stock
            }
        }));
        
        // BatchWrite for products
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                'products': productItems
            }
        }));
        
        // BatchWrite for stocks
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                'stocks': stockItems
            }
        }));
        
        console.log('Successfully populated tables');
        console.log('Products:', products);
        console.log('Stocks:', stocks);
        
    } catch (error) {
        console.error('Error filling tables:', error);
        throw error;
    }
}

// Execute the function
fillTables()
.then(() => console.log('Tables filled successfully'))
.catch(error => console.error('Failed to fill tables:', error));
