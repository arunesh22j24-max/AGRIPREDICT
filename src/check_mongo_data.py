import pymongo
client = pymongo.MongoClient("mongodb://localhost:27017/")
print(client.list_database_names())
db = client["agri_db"]
print(db.list_collection_names())
collection = db["yield_data"]
print(collection.count_documents({}))
print(collection.find_one())

# Query all training data
cursor = collection.find({})
data = list(cursor)

# Extract features and target
soil_type = [d.get('soil_type', 0) for d in data]
crop_type = [d.get('crop_type', 0) for d in data]
irrigation_type = [d.get('irrigation_type', 0) for d in data]
acres = [d.get('acres', 1.0) for d in data]
temp = [d.get('temp', 25.0) for d in data]
humidity = [d.get('humidity', 60.0) for d in data]
rainfall = [d.get('rainfall', 0.0) for d in data]
oc = [d.get('oc', 1.0) for d in data]
ph = [d.get('ph', 7.0) for d in data]
yield_ = [d.get('yield', 2.0) for d in data]

import numpy as np
X = np.column_stack([soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph])
y = np.array(yield_)
print("Raw data:", data)
for doc in data:
    print(doc)