# train_yield_models_mongo.py
# Automated LightGBM training from MongoDB for yield prediction

import pymongo
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split

# MongoDB connection details
mongo_host = 'localhost'
mongo_port = 27017
mongo_db = 'agri_db'  # <-- update with your database name
mongo_collection = 'yield_data'  # <-- update with your collection name

# Connect to MongoDB
client = pymongo.MongoClient(mongo_host, mongo_port)
db = client[mongo_db]
collection = db[mongo_collection]


# Query all training data
cursor = collection.find({})
data = list(cursor)
print("Raw data:", data)
for doc in data:
    print(doc)

# Extract features and target
soil_map = {'loamy':0,'sandy':1,'clay':2,'silt':3,'peat':4,'chalk':5,'red':6,'laterite':7,'black':8,'alluvial':9,'saline':10,'peaty':11,'mixed':12}
soil_type = [soil_map.get(str(d.get('soil_type', '')).lower(), 0) for d in data]
crop_map = {
    'wheat': 0, 'rice': 1, 'cotton': 2, 'vegetables': 3, 'pulses': 4,
    'peanuts': 5, 'watermelon': 6, 'potatoes': 7, 'carrots': 8, 'cantaloupe': 9,
    'soybean': 10, 'broccoli': 11, 'cabbage': 12, 'tomatoes': 13, 'onions': 14,
    'garlic': 15, 'peppers': 16, 'lettuce': 17, 'celery': 18, 'barley': 19,
    'beet': 20, 'spinach': 21, 'millets': 22, 'groundnut': 23, 'cashew': 24,
    'pineapple': 25, 'tea': 26, 'coffee': 27, 'sunflower': 28, 'jute': 29,
    'sugarcane': 30, 'sugar beet': 31
}
unmapped_crops = set()
for d in data:
    crop = str(d.get('crop_type', '')).lower()
    if crop not in crop_map:
        unmapped_crops.add(crop)
crop_type = [crop_map.get(str(d.get('crop_type', '')).lower(), 0) for d in data]
if unmapped_crops:
    print("Unmapped crop types in data (not trained):", unmapped_crops)
irrigation_map = {'drip':0,'sprinkler':1,'canal':2,'none':3}
irrigation_type = [irrigation_map.get(str(d.get('irrigation_type', '')).lower(), 0) for d in data]
acres = [d.get('acres', 1.0) for d in data]
temp = [d.get('temp', 25.0) for d in data]
humidity = [d.get('humidity', 60.0) for d in data]
rainfall = [d.get('rainfall', 0.0) for d in data]
oc = [d.get('oc', 1.0) for d in data]
ph = [d.get('ph', 7.0) for d in data]
yield_ = [d.get('yield', 2.0) for d in data]
print("\n===== Feature Summary =====")
print(f"Soil Type:      {soil_type}")
print(f"  Unique:       {set(soil_type)}")
print(f"Crop Type:      {crop_type}")
print(f"  Unique:       {set(crop_type)}")
print(f"Irrigation Type:{irrigation_type}")
print(f"  Unique:       {set(irrigation_type)}")
print(f"Acres:          {acres}")
print(f"Temp:           {temp}")
print(f"Humidity:       {humidity}")
print(f"Rainfall:       {rainfall}")
print(f"OC:             {oc}")
print(f"pH:             {ph}")
print(f"Yield:          {yield_}")
print("===========================\n")

import numpy as np
X = np.column_stack([soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph])
y = np.array(yield_)
print("X shape:", X.shape)
print("y shape:", y.shape)

# Train/test split (optional)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=42)

# Train LightGBM model
lgb_train = lgb.Dataset(X_train, label=y_train)
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'verbosity': -1,
    'seed': 42
}
lgb_model = lgb.train(params, lgb_train, num_boost_round=100)
lgb_model.save_model('lgb_yield_model.txt')

print('LightGBM model trained and saved with MongoDB data.')
