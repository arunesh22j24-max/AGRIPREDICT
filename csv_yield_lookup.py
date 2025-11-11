import pandas as pd

# Load the CSV once at startup for fast lookup
yield_df = pd.read_csv('traincrop.csv')

def lookup_yield(soil_type, crop_type, irrigation_type):
    # Normalize input for matching
    s = str(soil_type).strip().lower()
    c = str(crop_type).strip().lower()
    i = str(irrigation_type).strip().lower()
    # Try to find a matching row
    row = yield_df[(yield_df['soil_type'].str.lower() == s) &
                   (yield_df['crop_type'].str.lower() == c) &
                   (yield_df['irrigation_type'].str.lower() == i)]
    if not row.empty:
        # Return the yield per acre from the first match
        return float(row.iloc[0]['yield_per_acre'])
    return None
