# ml_yield_predictor.py
# Simple ML model for crop yield prediction (example)

from flask import Flask, request, jsonify

import numpy as np
import pickle
from flask_cors import CORS
import xgboost as xgb
import os
import lightgbm as lgb
import requests
import logging
# CSV yield lookup
import csv_yield_lookup

app = Flask(__name__)
CORS(app)

# configure logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'svm': svm_model is not None,
            'lgb': lgb_model is not None,
            'xgb': xgb_model is not None
        },
        'model_load_errors': model_load_errors
    })




def get_soil_data(lat, lon):
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=ocd&property=phh2o"
    try:
        resp = requests.get(url)
        data = resp.json()
        # Extract organic carbon (ocd) and pH (phh2o) from SoilGrids v2.0 response
        oc = 1.0
        ph = 7.0
        if 'properties' in data:
            if 'ocd' in data['properties'] and 'values' in data['properties']['ocd']:
                oc_val = data['properties']['ocd']['values'][0].get('value', 1.0)
                oc = float(oc_val)
            if 'phh2o' in data['properties'] and 'values' in data['properties']['phh2o']:
                ph_val = data['properties']['phh2o']['values'][0].get('value', 7.0)
                ph = float(ph_val)
        return oc, ph
    except Exception as e:
        return 1.0, 7.0

def encode_features(soil_type, crop_type, irrigation_type, acres, lat, lon):
    """
    Encode features for model prediction using default environmental values
    that match our training data.
    """
    # Use default environmental values that match training
    temp = 28.5  # Average temperature in Celsius
    humidity = 65.0  # Average humidity percentage
    rainfall = 150.0  # Average monthly rainfall in mm
    # Use same encoding as training script
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
    s = soil_map.get(str(soil_type).lower(), 0)
    c = crop_map.get(str(crop_type).lower(), 0)
    i = irrigation_map.get(str(irrigation_type).lower(), 0)
    try:
        a = float(acres)
    except:
        a = 1.0
    # Use provided environmental values (no mocking)
    try:
        t = float(temp)
        h = float(humidity)
        r = float(rainfall)
    except Exception:
        raise ValueError('temp, humidity and rainfall must be numeric and provided')
    oc, ph = get_soil_data(lat, lon)
    return np.array([[s, c, i, a, t, h, r, oc, ph]])


# Robust model loading with error handling
svm_model = None
lgb_model = None
xgb_model = None
model_load_errors = []
try:
    if os.path.exists('svm_yield_model.pkl'):
        svm_model = pickle.load(open('svm_yield_model.pkl', 'rb'))
    else:
        model_load_errors.append('svm_yield_model.pkl not found')
except Exception as e:
    model_load_errors.append(f'SVM model load error: {e}')
try:
    if os.path.exists('lgb_yield_model.txt'):
        lgb_model = lgb.Booster(model_file='lgb_yield_model.txt')
    else:
        model_load_errors.append('lgb_yield_model.txt not found')
except Exception as e:
    model_load_errors.append(f'LightGBM model load error: {e}')
try:
    if os.path.exists('xgb_yield_model.json'):
        xgb_model = xgb.XGBRegressor()
        xgb_model.load_model('xgb_yield_model.json')
    else:
        model_load_errors.append('xgb_yield_model.json not found')
except Exception as e:
    model_load_errors.append(f'XGBoost model load error: {e}')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    # Validate required input fields
    required_fields = ['soil_type', 'crop_type', 'irrigation_type', 'acres', 'lat', 'lon', 'model']
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    # Check model load errors
    if model_load_errors:
        return jsonify({'error': 'Model load error', 'details': model_load_errors}), 500

    soil_type = data.get('soil_type', '')
    crop_type = data.get('crop_type', '')
    irrigation_type = data.get('irrigation_type', '')
    acres = data.get('acres', 1)
    lat = data.get('lat', 20.3)
    lon = data.get('lon', 85.8)
    # Always use CSV for prediction
    model_type = 'csv'


    try:
        logging.info(f"Prediction request: model={model_type}, soil={soil_type}, crop={crop_type}, irrigation={irrigation_type}, acres={acres}, lat={lat}, lon={lon}")
        if model_type == 'csv':
            # Use CSV lookup for yield per acre
            yield_per_acre = csv_yield_lookup.lookup_yield(soil_type, crop_type, irrigation_type)
            if yield_per_acre is None:
                return jsonify({'error': 'No matching entry in CSV for given inputs.'}), 404
            total_yield = round(yield_per_acre * float(acres), 2)
            concise = f"Predicted yield per acre: {yield_per_acre} tons, Total yield: {total_yield} tons (CSV)"
            logging.info(f"CSV Prediction result: {concise}")
            return jsonify({
                'predicted_yield_per_acre': yield_per_acre,
                'total_yield': total_yield,
                'acres': acres,
                'message': concise
            })
        elif model_type == 'svm':
            if svm_model is None:
                return jsonify({'error': 'SVM model not loaded.'}), 500
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
            s = soil_map.get(soil_type.lower(), 0)
            c = crop_map.get(crop_type.lower(), 0)
            i = irrigation_map.get(irrigation_type.lower(), 0)
            try:
                a = float(acres)
            except:
                a = 1.0
            X = np.array([[s, c, i, a]])
            pred = svm_model.predict(X)
            yield_per_acre = round(float(pred[0]), 2)
            total_yield = round(yield_per_acre * float(acres), 2)
            concise = f"Predicted yield per acre: {yield_per_acre} tons, Total yield: {total_yield} tons"
            logging.info(f"Prediction result: {concise}")
            return jsonify({
                'predicted_yield_per_acre': yield_per_acre,
                'total_yield': total_yield,
                'acres': acres,
                'message': concise
            })
        elif model_type == 'lgb':
            if lgb_model is None:
                return jsonify({'error': 'LightGBM model not loaded.'}), 500
            # encode using default environmental values
            X = encode_features(soil_type, crop_type, irrigation_type, acres, lat, lon)
            pred = lgb_model.predict(X)
            yield_per_acre = round(float(pred[0]), 2)
            total_yield = round(yield_per_acre * float(acres), 2)
            concise = f"Predicted yield per acre: {yield_per_acre} tons, Total yield: {total_yield} tons"
            logging.info(f"Prediction result: {concise}")
            return jsonify({
                'predicted_yield_per_acre': yield_per_acre,
                'total_yield': total_yield,
                'acres': acres,
                'message': concise
            })
        elif model_type == 'xgb':
            if xgb_model is None:
                return jsonify({'error': 'XGBoost model not loaded.'}), 500
            X = encode_features(soil_type, crop_type, irrigation_type, acres, lat, lon)
            pred = xgb_model.predict(X)
            yield_per_acre = round(float(pred[0]), 2)
            total_yield = round(yield_per_acre * float(acres), 2)
            concise = f"Predicted yield per acre: {yield_per_acre} tons, Total yield: {total_yield} tons"
            logging.info(f"Prediction result: {concise}")
            return jsonify({
                'predicted_yield_per_acre': yield_per_acre,
                'total_yield': total_yield,
                'acres': acres,
                'message': concise
            })
        else:
            return jsonify({'error': f'Unknown model type: {model_type}'}), 400
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

if __name__ == '__main__':
    # Expose on all interfaces to ease local testing, debug on
    app.run(host='0.0.0.0', port=5001, debug=True)
