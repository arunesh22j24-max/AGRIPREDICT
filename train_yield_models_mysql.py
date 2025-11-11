# train_yield_models_mysql.py
# Automated LightGBM training from MySQL for yield prediction

import pymysql
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split

# MySQL connection details (default)
host = 'localhost'
port = 3306
db = 'agri_db'
table = 'yield_data'
user = 'root'
password = ''  # Set your password if needed

# Connect to MySQL
conn = pymysql.connect(host=host, port=port, user=user, password=password, database=db)
cursor = conn.cursor()

# Query all training data
query = f"SELECT soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph, yield FROM {table}"
cursor.execute(query)
data = cursor.fetchall()

# Convert to numpy arrays
soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph, yield_ = zip(*data)
soil_type = np.array(soil_type)
crop_type = np.array(crop_type)
irrigation_type = np.array(irrigation_type)
acres = np.array(acres)
temp = np.array(temp)
humidity = np.array(humidity)
rainfall = np.array(rainfall)
oc = np.array(oc)
ph = np.array(ph)
yield_ = np.array(yield_)

# Stack features
X = np.column_stack([soil_type, crop_type, irrigation_type, acres, temp, humidity, rainfall, oc, ph])
y = yield_

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

print('LightGBM model trained and saved with MySQL data.')
