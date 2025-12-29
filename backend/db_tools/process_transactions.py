import pandas as pd
import numpy as np
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
ALEMBIC_SQL_DIR = BACKEND_DIR / 'alembic' / 'sql'

def parse_date(d):
    parts = d.split('/')
    if len(parts) != 3:
        return None
    m, day, y = parts
    year = 2000 + int(y)
    return f'{year}-{int(m):02d}-{int(day):02d}'

def parse_room(r):
    if pd.isna(r) or not r:
        return None, None
    if '樓店面' in r:
        return 1, 'S'
    if len(r) >= 2 and r[0].isdigit() and r[1].isupper():
        return int(r[0]), r[1]
    return None, None

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    return str(s).replace("'", "''")

# Read CSV from the same directory as this script
csv_path = SCRIPT_DIR / 'transactions.csv'
if not csv_path.exists():
    raise FileNotFoundError(f"CSV file not found at: {csv_path}")

df = pd.read_csv(csv_path, encoding='utf-8-sig')
df.columns = df.columns.str.strip()
df['金額'] = df['金額'].astype(str).str.replace(r'[" ,]', '', regex=True).replace('', np.nan).astype(float)
df['flow_date'] = df['日期'].apply(parse_date)
df['號'] = df['號'].astype(str).str.strip()
df['building_no'] = df['號'].replace('', np.nan).astype(float).astype('Int64')
df['室'] = df['室'].astype(str).str.strip()
df['room_str'] = df['室'].replace('', pd.NA)
df['備註'] = df['備註'].astype(str)
df.loc[df['備註'].str.contains('1樓店面', na=False) & df['room_str'].isna(), 'room_str'] = '1S'
df['摘要'] = df['摘要'].astype(str).str.strip()
df['收入/支出'] = df['收入/支出'].astype(str).str.strip()

unique_buildings = sorted(df['building_no'].dropna().unique())

rooms_per_building = {}
for b in unique_buildings:
    rooms = df[df['building_no'] == b]['room_str'].dropna().unique()
    parsed_rooms = set()
    for r in rooms:
        floor, no = parse_room(r)
        if floor and no:
            parsed_rooms.add((floor, no))
    rooms_per_building[b] = list(parsed_rooms)

category_to_dir = df.groupby('摘要')['收入/支出'].agg(lambda x: x.unique())
consistent_categories = {k: v[0] for k, v in category_to_dir.items() if len(v) == 1}
inconsistent = {k: v for k, v in category_to_dir.items() if len(v) > 1}
if inconsistent:
    print(f'Warning: Inconsistent directions found for some summaries: {inconsistent}. These will be skipped.')

sql = """
DO $$
DECLARE
  v_user_id BIGINT;
  v_cash_account_id BIGINT;
  v_category_ids jsonb = jsonb '{}';
  v_building_ids jsonb = jsonb '{}';
  v_room_ids jsonb = jsonb '{}';
  v_temp BIGINT;
BEGIN
  -- Insert user
  INSERT INTO user_account (email, password_hash, is_active) OVERRIDING SYSTEM VALUE 
  VALUES ('admin@example.com', 'dummyhash', TRUE) RETURNING id INTO v_user_id;

  -- Insert cash_account
  INSERT INTO cash_account (name, account_type) OVERRIDING SYSTEM VALUE 
  VALUES ('銀行帳戶', '銀行') RETURNING id INTO v_cash_account_id;

  -- Insert categories using bulk INSERT
"""

# Build categories VALUES clause
cat_values = []
for cat, dirr in sorted(consistent_categories.items()):
    dir_enum = '收入' if dirr == '收入' else '支出' if dirr == '支出' else '轉帳'
    cat_escaped = escape_sql_string(cat)
    cat_values.append(f"('{cat_escaped}', '{cat_escaped}', '{dir_enum}')")

if cat_values:
    sql += "  WITH category_inserts AS (\n"
    sql += "    INSERT INTO cash_flow_category (code, name, direction) OVERRIDING SYSTEM VALUE\n"
    sql += "    VALUES\n"
    sql += '      ' + ',\n      '.join(cat_values) + "\n"
    sql += "    RETURNING id, code\n"
    sql += "  )\n"
    sql += "  SELECT jsonb_object_agg(code, id) INTO v_category_ids FROM category_inserts;\n\n"

# Insert buildings using bulk INSERT
if unique_buildings:
    building_values = [f"({b}, 'Address for building {b}', v_user_id)" for b in unique_buildings]
    sql += "  WITH building_inserts AS (\n"
    sql += "    INSERT INTO building (building_no, address, created_by) OVERRIDING SYSTEM VALUE\n"
    sql += "    VALUES\n"
    sql += '      ' + ',\n      '.join(building_values) + "\n"
    sql += "    RETURNING id, building_no\n"
    sql += "  )\n"
    sql += "  SELECT jsonb_object_agg(building_no::text, id) INTO v_building_ids FROM building_inserts;\n\n"

# Insert rooms - we need individual inserts to maintain ID mapping for cash_flows
# Group by building for cleaner output
for b in unique_buildings:
    if b in rooms_per_building and rooms_per_building[b]:
        b_id_expr = f"(v_building_ids ->> '{b}')::BIGINT"
        sql += f"  -- Insert rooms for building {b}\n"
        for floor, no in sorted(rooms_per_building[b]):
            no_escaped = escape_sql_string(no)
            key = f"{b}_{floor}_{no}"
            sql += f"  INSERT INTO room (building_id, floor_no, room_no, created_by) OVERRIDING SYSTEM VALUE\n"
            sql += f"    VALUES ({b_id_expr}, {floor}, '{no_escaped}', v_user_id) RETURNING id INTO v_temp;\n"
            sql += f"  v_room_ids := v_room_ids || jsonb_build_object('{key}', v_temp);\n"
        sql += "\n"

# Prepare cash flow data for bulk insert
sql += "  -- Insert cash_flows using bulk INSERT\n"
cash_flow_rows = []
for idx, row in df.iterrows():
    if pd.isna(row['金額']) or row['摘要'] not in consistent_categories or row['flow_date'] is None:
        continue
    
    category = row['摘要']
    cat_escaped = escape_sql_string(category)
    cat_id_expr = f"(v_category_ids ->> '{cat_escaped}')::BIGINT"
    amount = row['金額']
    flow_date = row['flow_date']
    
    # Handle note
    note = row['備註']
    if pd.isna(note) or str(note) == 'nan' or note == '':
        note_str = 'NULL'
    else:
        note_escaped = escape_sql_string(note)
        note_str = f"'{note_escaped}'"
    
    payment_method = '銀行轉帳'
    lease_id = 'NULL'
    invoice_id = 'NULL'
    
    # Handle building and room
    if pd.isna(row['building_no']):
        building_id = 'NULL'
        room_id = 'NULL'
    else:
        b = row['building_no']
        building_id = f"(v_building_ids ->> '{b}')::BIGINT"
        if pd.isna(row['room_str']):
            room_id = 'NULL'
        else:
            floor, no = parse_room(row['room_str'])
            if floor is None or no is None:
                continue
            key = f"{b}_{floor}_{no}"
            room_id = f"(v_room_ids ->> '{key}')::BIGINT"
    
    cash_flow_rows.append(
        f"({cat_id_expr}, v_cash_account_id, {lease_id}, {building_id}, {room_id}, {invoice_id}, "
        f"'{flow_date}', {amount}, '{payment_method}', {note_str}, v_user_id)"
    )

# Group cash flows into chunks for better readability (500 rows per INSERT)
chunk_size = 500
for i in range(0, len(cash_flow_rows), chunk_size):
    chunk = cash_flow_rows[i:i + chunk_size]
    sql += "  INSERT INTO cash_flow (category_id, cash_account_id, lease_id, building_id, room_id, invoice_id, flow_date, amount, payment_method, note, created_by)\n"
    sql += "  VALUES\n"
    sql += '    ' + ',\n    '.join(chunk) + ";\n\n"

sql += "END $$;"

# Write SQL to output file
output_file = ALEMBIC_SQL_DIR / '0003_insert_transations.sql'
output_file.parent.mkdir(parents=True, exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"SQL generated successfully and written to: {output_file}")
print(f"Total SQL length: {len(sql)} characters")
print(f"Categories: {len(cat_values)}, Buildings: {len(unique_buildings)}, "
      f"Rooms: {sum(len(rooms_per_building[b]) for b in unique_buildings)}, "
      f"Cash flows: {len(cash_flow_rows)}")
