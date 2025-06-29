// Script to migrate data from test database to wms-tutorial database
const { MongoClient } = require('mongodb');

// MongoDB connection URIs
const SOURCE_URI = 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/test?retryWrites=true&w=majority';
const TARGET_URI = 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'processes',
  'globalsettings',
  'settings',
  'presentations',
  'tests'
];

// Skip these collections as they already exist in the target database
const SKIP_COLLECTIONS = [
  'users',
  'usersettings',
  'tokenblacklists'
];

async function migrateData() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);
  
  try {
    // Connect to both databases
    console.log('Connecting to source and target MongoDB databases...');
    await sourceClient.connect();
    await targetClient.connect();
    console.log('Connected to MongoDB databases successfully');
    
    // Get database references
    const sourceDb = sourceClient.db('test');
    const targetDb = targetClient.db('wms-tutorial');
    
    // Get list of all collections in source database
    const sourceCollections = await sourceDb.listCollections().toArray();
    const sourceCollectionNames = sourceCollections.map(c => c.name);
    
    console.log('\nCollections in source database:', sourceCollectionNames);
    
    // Get list of all collections in target database
    const targetCollections = await targetDb.listCollections().toArray();
    const targetCollectionNames = targetCollections.map(c => c.name);
    
    console.log('Collections in target database:', targetCollectionNames);
    
    // Determine which collections to migrate
    const collectionsToMigrate = COLLECTIONS_TO_MIGRATE.filter(name => 
      sourceCollectionNames.includes(name) && !SKIP_COLLECTIONS.includes(name)
    );
    
    console.log('\nMigrating the following collections:', collectionsToMigrate);
    
    // Migrate each collection
    for (const collectionName of collectionsToMigrate) {
      console.log(`\nMigrating collection: ${collectionName}`);
      
      // Check if collection exists in target database
      const collectionExists = targetCollectionNames.includes(collectionName);
      
      // Get documents from source collection
      const sourceCollection = sourceDb.collection(collectionName);
      const documents = await sourceCollection.find({}).toArray();
      
      console.log(`Found ${documents.length} documents in source collection`);
      
      if (documents.length === 0) {
        console.log(`Skipping empty collection: ${collectionName}`);
        continue;
      }
      
      // Insert documents into target collection
      const targetCollection = targetDb.collection(collectionName);
      
      if (collectionExists) {
        console.log(`Collection ${collectionName} already exists in target database`);
        console.log(`Adding ${documents.length} documents to existing collection`);
      } else {
        console.log(`Creating new collection ${collectionName} in target database`);
      }
      
      // Insert documents into target collection
      const result = await targetCollection.insertMany(documents, { ordered: false });
      console.log(`Inserted ${result.insertedCount} documents into ${collectionName}`);
      
      // Display sample of migrated data
      if (documents.length > 0) {
        console.log('Sample document:');
        console.log(JSON.stringify(documents[0], null, 2));
      }
    }
    
    console.log('\nData migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the connections
    await sourceClient.close();
    await targetClient.close();
    console.log('\nMongoDB connections closed');
  }
}

// Run the migration
migrateData();
