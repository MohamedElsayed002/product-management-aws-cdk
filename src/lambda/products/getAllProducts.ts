import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ProductRecord } from "../../types/product";


// Initialize AWS Clients
const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Environment variables 
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME!

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.log('Event received',JSON.stringify(event,null,2))

    try {
        const scanResult = await docClient.send(
            new ScanCommand({
                TableName: PRODUCTS_TABLE_NAME
            })
        )

    const products: ProductRecord[] = (scanResult.Items as unknown as ProductRecord[]) || [];

    products.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`Retrieved ${products.length} products from DynamoDB`)

    return {
        statusCode:200,
        body: JSON.stringify(products)
    }
    }catch(error) {
        console.log('Error retrieving products ',error)

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        }
    }
}