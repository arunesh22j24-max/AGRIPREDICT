soil_types = ['loamy','sandy','clay','red','black','alluvial','laterite','peaty','saline','mixed']
irrigation_types = ['drip','sprinkler','canal','none']
crops = ['Wheat','Rice','Peanuts','Cotton','Sugarcane','Vegetables','Millets','Cashew','Potatoes','Barley','Pulses','Banana','Watermelon','Onions','Groundnut']

rows = []
for crop in crops:
    for soil in soil_types:
        for irrigation in irrigation_types:
            acres = 10
            lat = 20.3
            lon = 85.8
            base_yield = 2.0 + 0.1*soil_types.index(soil) + 0.2*crops.index(crop) + 0.05*irrigation_types.index(irrigation)
            predicted_yield = base_yield
            total_yield = round(predicted_yield * acres, 2)
            rows.append(f"{soil},{crop},{irrigation},{acres},{lat},{lon},{base_yield:.2f},{predicted_yield:.2f},{total_yield}")

with open('e:/myreactpp/my-pp/src/traincrop.csv', 'w') as f:
    f.write('soil_type,crop_type,irrigation_type,acres,lat,lon,yield_per_acre,predicted_yield_per_acre,total_yield\n')
    for row in rows:
        f.write(row + '\n')