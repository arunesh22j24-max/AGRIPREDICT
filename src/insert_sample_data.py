import pymongo
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["agri_db"]
collection = db["yield_data"]

sample_data = [
    {
        "soil_type": 0, "crop_type": 0, "irrigation_type": 0, "acres": 10,
        "temp": 28, "humidity": 60, "rainfall": 5, "oc": 1.2, "ph": 6.8, "yield": 3.5
    },
    {
        "soil_type": 1, "crop_type": 1, "irrigation_type": 1, "acres": 8,
        "temp": 30, "humidity": 65, "rainfall": 7, "oc": 1.0, "ph": 7.2, "yield": 2.8
    }
    # Add more samples as needed
]

collection.insert_many(sample_data)
print("Inserted sample data.")