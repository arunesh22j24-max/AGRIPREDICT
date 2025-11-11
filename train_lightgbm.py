# train_lightgbm.py
# Example script to train a LightGBM model for crop yield prediction from CSV data

import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split

# Load your data (update the filename as needed)
data = pd.read_csv('your_training_data.csv')

# Example: columns = ['soil_type', 'crop_type', 'irrigation_type', 'acres', 'temp', 'humidity', 'rainfall', 'oc', 'ph', 'yield']
# You must encode categorical variables as integers (same as in backend)
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

data['soil_type'] = data['soil_type'].str.lower().map(soil_map)
data['crop_type'] = data['crop_type'].str.lower().map(crop_map)
data['irrigation_type'] = data['irrigation_type'].str.lower().map(irrigation_map)

# Features and target
features = ['soil_type', 'crop_type', 'irrigation_type', 'acres', 'temp', 'humidity', 'rainfall', 'oc', 'ph']
target = 'yield'

X = data[features]
y = data[target]

# Split data for training/testing
dtrain, dval, ytrain, yval = train_test_split(X, y, test_size=0.2, random_state=42)

# Create LightGBM datasets
lgb_train = lgb.Dataset(dtrain, ytrain)
lgb_eval = lgb.Dataset(dval, yval, reference=lgb_train)

# Train model
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'verbosity': -1,
    'boosting_type': 'gbdt',
    'learning_rate': 0.1,
    'num_leaves': 31
}
print('Training LightGBM model...')
gbm = lgb.train(params, lgb_train, valid_sets=[lgb_train, lgb_eval], num_boost_round=100, early_stopping_rounds=10)

gbm.save_model('lgb_yield_model.txt')
print('Model saved as lgb_yield_model.txt')
