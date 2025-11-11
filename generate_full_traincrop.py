import csv

soil_types = [
    'loamy', 'sandy', 'clay', 'silt', 'peat', 'chalk', 'red', 'laterite', 'black', 'alluvial', 'saline', 'peaty', 'mixed'
]
crops = [
    'wheat', 'rice', 'cotton', 'vegetables', 'pulses', 'peanuts', 'watermelon', 'potatoes', 'carrots', 'cantaloupe',
    'soybean', 'broccoli', 'cabbage', 'tomatoes', 'onions', 'garlic', 'peppers', 'lettuce', 'celery', 'barley',
    'beet', 'spinach', 'millets', 'groundnut', 'cashew', 'pineapple', 'tea', 'coffee', 'sunflower', 'jute',
    'sugarcane', 'sugar beet'
]
irrigation_types = ['drip', 'sprinkler', 'canal', 'none', 'flood', 'furrow', 'basin', 'rainfed']

def get_realistic_yield(crop, irrigation):
    base_yield = 2.0
    if irrigation == 'drip':
        return base_yield + 2.0
    elif irrigation == 'sprinkler':
        return base_yield + 1.5
    elif irrigation == 'canal':
        return base_yield + 1.0
    elif irrigation == 'flood':
        return base_yield + 0.5
    elif irrigation == 'furrow':
        return base_yield + 0.7
    elif irrigation == 'basin':
        return base_yield + 0.8
    elif irrigation == 'rainfed':
        return base_yield - 0.5
    elif irrigation == 'none':
        return base_yield - 1.0
    else:
        return base_yield

for filename in ['traincrop.csv', 'src/traincrop.csv']:
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['soil_type', 'crop_type', 'irrigation_type', 'yield_per_acre'])
        for soil in soil_types:
            for crop in crops:
                for irrigation in irrigation_types:
                    yield_value = get_realistic_yield(crop, irrigation)
                    writer.writerow([soil, crop, irrigation, yield_value])

print('traincrop.csv and src/traincrop.csv generated with all combinations and realistic yields.')
