import json
import psycopg2

# Load JSON from file or paste your JSON as a string
with open("users.json", "r") as f:
    data = json.load(f)

# Connect to PostgreSQL
conn = psycopg2.connect(
    dbname="meeting_scheduler",
    user="scheduler",
    password="scheduler",
    host="localhost",
    port=5432
)
cur = conn.cursor()

# Prepare the insert query
query = """
INSERT INTO users (id, display_name, email, user_principal_name, raw_json)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (id) DO NOTHING;
"""

# Loop through all users and insert
for user in data["value"]:
    user_id = user["id"]
    display_name = user.get("displayName")
    email = user.get("mail") or user.get("userPrincipalName")
    upn = user.get("userPrincipalName")
    raw_json = json.dumps(user)
    
    cur.execute(query, (user_id, display_name, email, upn, raw_json))

# Commit and close
conn.commit()
cur.close()
conn.close()

print("All users inserted successfully!")
