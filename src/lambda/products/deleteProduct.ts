
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ProductRecord } from "../../types/product";


// Initialize AWS Clients
const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const s3Client = new S3Client({})

// Env variables
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME!
const PRODUCTS_IMAGES_BUCKET_NAME = process.env.PRODUCTS_IMAGES_BUCKET_NAME!


export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    console.log('Event received:', JSON.stringify(event, null, 2))

    try {
        // Get product ID from path parameters
        const productId = event.pathParameters?.id;

        if (!productId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Product ID is required',
                }),
            };
        }

        // First, get the product to retrieve the image URL
        let product: ProductRecord;
        try {
            const getResult = await docClient.send(
                new GetCommand({
                    TableName: PRODUCTS_TABLE_NAME,
                    Key: { id: productId },
                })
            );

            if (!getResult.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'Product not found',
                    }),
                };
            }

            product = getResult.Item as ProductRecord;

        } catch (dynamoError) {
            console.error('Error retrieving product from DynamoDB:', dynamoError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to retrieve product',
                }),
            };
        }

        // Delete Image if exists in S3
        if (product.imageUrl) {
            try {
                // Extract S3 Key from the URL
                const urlParts = product.imageUrl.split('/')
                const s3key = urlParts.slice(3).join('/')  // Remove https://bucket-name.s3.amazonaws.com/

                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: PRODUCTS_IMAGES_BUCKET_NAME,
                        Key: s3key
                    })
                )

                console.log('Image deleted from s3', s3key)


            } catch (error) {
                console.log('Error deleting image from S3', error)
            }
        }

        // Delete Product from DynamoDB
        try {
            await docClient.send(
                new DeleteCommand({
                    TableName: PRODUCTS_TABLE_NAME,
                    Key: { id: productId }
                })
            )

            console.log('Product deleted from DynamoDB', productId)
        } catch (error) {
            console.log('Error deleting product from DynamoDB', error)
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to delete product',
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Product deleted successfully',
                productId: productId
            })
        }

    } catch (error) {
        console.error('Error processing request:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
}