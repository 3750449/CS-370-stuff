
import mysql.connector
import os

# Establish a database connection
db = mysql.connector.connect(
    host="localhost",
    user="your_username",
    passwd="your_password",
    database="your_database"
)

cursor = db.cursor()

# Open your image file in binary mode
with open('path_to_your_image.jpg', 'rb') as f:
    binary_data = f.read()

# Insert the image
query = "INSERT INTO image_store (image_name, image_data) VALUES (%s, %s)"
cursor.execute(query, ('example.jpg', binary_data))
db.commit()

print("Image uploaded successfully.")

# Close the connection
cursor.close()
db.close()






import mysql.connector

# Establish a database connection
db = mysql.connector.connect(
    host="localhost",
    user="your_username",
    passwd="your_password",
    database="your_database"
)

cursor = db.cursor()

# Retrieve the image
query = "SELECT image_data FROM image_store WHERE image_name = 'example.jpg'"
cursor.execute(query)

# Fetch the data
image_data = cursor.fetchone()[0]

# Write the data back to a file
with open('retrieved_image.jpg', 'wb') as f:
    f.write(image_data)

print("Image retrieved and written to file.")

# Close the connection
cursor.close()
db.close()


