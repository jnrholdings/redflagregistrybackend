import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'RedFlagRegistryData';

// Initialize the DynamoDB Document client
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log(`Event ${JSON.stringify(event,null,2)}`)
    // Ensure that the input is a list of Problem Individuals
    if (!Array.isArray(event) || event.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid input. Expected a non-empty array of problem individuals.' }),
      };
    }

    // Convert the input list to the Problem Individual Record format
    const records = event.map((individual) => ({
      PutRequest: {
        Item: {
          PK: `problem#${individual.Name || ''}`, // Partition key based on name
          SK: 'meta#data', // Sort key for metadata
          RecordType: 'ProblemIndividual',
          Name: individual.Name || '',
          PhoneNumber: individual.PhoneNumber || '',
          Age: individual.Age || '',
          RepeatOffender: individual.RepeatOffender || '',
          TimeWaster: individual.TimeWaster || '',
        },
      },
    }));

    // Batch write to DynamoDB (DynamoDB allows up to 25 items per batch)
    const MAX_BATCH_SIZE = 25;
    for (let i = 0; i < records.length; i += MAX_BATCH_SIZE) {
      const batch = records.slice(i, i + MAX_BATCH_SIZE);
      const params = {
        RequestItems: {
          [TABLE_NAME]: batch,
        },
      };

      // Use BatchWriteCommand from @aws-sdk/lib-dynamodb to batch insert
      await ddbDocClient.send(new BatchWriteCommand(params));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully inserted problem individuals into DynamoDB.' }),
    };
  } catch (error) {
    console.error('Error inserting into DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};
