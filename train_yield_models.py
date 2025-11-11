# train_yield_models.py
# Retrain LightGBM model with 9 features for yield prediction

import pandas as pd
import numpy as np
import lightgbm as lgb
import pickle

# Example: Load your training data
# Columns: soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph, yield
# Replace with your actual data loading
# df = pd.read_csv('your_training_data.csv')

# For demo, create synthetic data

df = pd.read_csv('training_data.csv')

# Feature encoding maps
soil_map = {'loamy':0,'sandy':1,'clay':2,'silt':3,'peat':4,'chalk':5,'red':6,'laterite':7,'black':8,'alluvial':9,'saline':10,'peaty':11,'mixed':12,
    'vertisol':13,'luvisol':14,'gleysol':15,'regosol':16,'arenosol':17,'cambisol':18,'fluvisol':19,'podzol':20,'umbrisol':21,'unknown':0}
crop_map = {
    'wheat': 0, 'rice': 1, 'cotton': 2, 'vegetables': 3, 'pulses': 4,
    'peanuts': 5, 'watermelon': 6, 'potatoes': 7, 'carrots': 8, 'cantaloupe': 9,
    'soybean': 10, 'broccoli': 11, 'cabbage': 12, 'tomatoes': 13, 'onions': 14,
    'garlic': 15, 'peppers': 16, 'lettuce': 17, 'celery': 18, 'barley': 19,
    'beet': 20, 'spinach': 21, 'millets': 22, 'groundnut': 23, 'cashew': 24,
    'pineapple': 25, 'tea': 26, 'coffee': 27, 'sunflower': 28, 'jute': 29,
    'sugarcane': 30, 'sugar beet': 31
}
irrigation_map = {'drip':0,'sprinkler':1,'canal':2,'none':3}

def encode_row(row):
    return [
        soil_map.get(str(row['soil_type']).lower(), 0),
        crop_map.get(str(row['crop_type']).lower(), 0),
        irrigation_map.get(str(row['irrigation_type']).lower(), 0),
        float(row['acres']),
        float(row.get('lat', 20.3)),
        float(row.get('lon', 85.8)),
        28.5, # temp
        65.0, # humidity
        150.0 # rainfall
    ]

X = np.array([encode_row(row) for _, row in df.iterrows()])
y = df['yield_per_acre'].values

# Train LightGBM model
lgb_train = lgb.Dataset(X, label=y)
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'verbosity': -1,
    'seed': 42
}
lgb_model = lgb.train(params, lgb_train, num_boost_round=100)
lgb_model.save_model('lgb_yield_model.txt')

# Optionally, retrain and save SVM/XGB models with same features
# ...

print('LightGBM model trained and saved with 9 features.')

# Train XGBoost model
import xgboost as xgb
xgb_model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, seed=42)
xgb_model.fit(X, y)
xgb_model.save_model('xgb_yield_model.json')

# Train SVM model
from sklearn.svm import SVR
svm_model = SVR()
svm_model.fit(X, y)
with open('svm_yield_model.pkl', 'wb') as f:
    pickle.dump(svm_model, f)

print('Models retrained and saved with crop-specific yields.')
