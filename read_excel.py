
import pandas as pd

try:
    excel_file = 'Cash_Tracker_With_Warning.xlsx'
    
    # Read all sheets
    xl = pd.ExcelFile(excel_file)
    print("Sheet names in Excel file:")
    for sheet_name in xl.sheet_names:
        print(f"- {sheet_name}")
        print()
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        print("First 10 rows:")
        print(df.head(10))
        print()
        print("Columns:")
        print(df.columns.tolist())
        print()
        print("Data types:")
        print(df.dtypes)
        print()
        print("-" * 80)
except Exception as e:
    print(f"Error reading Excel file: {e}")
