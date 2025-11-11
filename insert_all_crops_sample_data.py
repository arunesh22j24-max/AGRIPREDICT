# insert_all_crops_sample_data.py
# Insert sample documents for all crop types into MongoDB

import pymongo

mongo_host = 'localhost'
mongo_port = 27017
mongo_db = 'agri_db'
mongo_collection = 'yield_data'

client = pymongo.MongoClient(mongo_host, mongo_port)
db = client[mongo_db]
collection = db[mongo_collection]

crop_types = [
    'wheat', 'rice', 'cotton', 'vegetables', 'pulses',
    'peanuts', 'watermelon', 'potatoes', 'carrots', 'cantaloupe',
    'soybean', 'broccoli', 'cabbage', 'tomatoes', 'onions',
    'garlic', 'peppers', 'lettuce', 'celery', 'barley',
    'beet', 'spinach', 'millets', 'groundnut', 'cashew',
    'pineapple', 'tea', 'coffee', 'sunflower', 'jute',
    'sugarcane', 'sugar beet'
]

soil_types = ['loamy', 'sandy', 'clay', 'silt', 'peat', 'chalk', 'red', 'laterite', 'black', 'alluvial', 'saline', 'peaty', 'mixed']
irrigation_types = ['drip', 'sprinkler', 'canal', 'none']

sample_docs = []
for i, crop in enumerate(crop_types):
    doc = {
        'soil_type': soil_types[i % len(soil_types)],
        'crop_type': crop,
        'irrigation_type': irrigation_types[i % len(irrigation_types)],
        'acres': 5 + i,
        'temp': 25 + (i % 5),
        'humidity': 60 + (i % 10),
        'rainfall': 10 + (i % 7),
        'oc': 1.0 + (i % 3) * 0.1,
        'ph': 7.0 + (i % 2) * 0.2,
        'yield': 2.0 + (i % 6) * 0.5
    }
    sample_docs.append(doc)

result = collection.insert_many(sample_docs)
print(f"Inserted {len(result.inserted_ids)} documents for all crop types.")
