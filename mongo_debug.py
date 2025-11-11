import pymongo
client = pymongo.MongoClient("mongodb://localhost:27017/")
print("Databases:", client.list_database_names())
db = client["agri_db"]
print("Collections:", db.list_collection_names())
collection = db["yield_data"]
print("Document count:", collection.count_documents({}))
print("Sample document:", collection.find_one())
