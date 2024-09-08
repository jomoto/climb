import pandas as pd
import folium
from folium.plugins import MarkerCluster

# Load the CSV file into a pandas DataFrame (replace with your file path)
csv_file_path = '/Users/shino/Downloads/ticks.csv'
ticks_df = pd.read_csv(csv_file_path)


# Create a map centered at an approximate central location
center_location = [37.5, -119.5]  # Adjust as needed based on your data
mymap = folium.Map(location=center_location, zoom_start=6)  # Changed 'map' to 'mymap' to avoid conflict
print("Map initialized.")

# A dictionary to track routes that share the exact same location
location_dict = {}

# Iterate through each row in the dataframe
for idx, row in ticks_df.iterrows():
    try:
        # Extract route information
        date = row['Date']
        route_name = row['Route']
        rating = row['Rating']
        notes = row['Notes'] if pd.notna(row['Notes']) else ''  # Remove 'None' if no notes are present
        url = row['URL']
        location = tuple([float(coord) for coord in row['Location'].split(',')])  # Convert location to tuple of floats

        # Log the current route being processed
        print(f"Processing route: {route_name} at location: {location}")

        # Create a formatted popup with hyperlinked route name and a specified width
        popup_html = f"""
        <div style="width: 250px;">
            <b>Date:</b> {date}<br>
            <b>Route:</b> <a href="{url}" target="_blank">{route_name}</a><br>
            <b>Rating:</b> {rating}<br>
            {f"<b>Notes:</b> {notes}" if notes else ""}
        </div>
        """
        
        # Track routes that share the same location
        if location not in location_dict:
            location_dict[location] = []
        location_dict[location].append(folium.Marker(location=location, popup=popup_html))
    except Exception as e:
        print(f"Error processing route {route_name}: {e}")
        continue

# Spiderfy only those locations that have multiple routes
for location, markers in location_dict.items():
    try:
        if len(markers) > 1:
            # If there are multiple routes at the same location, spiderfy them
            marker_cluster = MarkerCluster(spiderfy_on_max_zoom=True).add_to(mymap)
            for marker in markers:
                marker.add_to(marker_cluster)
        else:
            # If only one route at this location, just add it to the map directly
            markers[0].add_to(mymap)
    except Exception as e:
        print(f"Error adding markers to the map for location {location}: {e}")
        continue

# Save the map to an HTML file
try:
    mymap.save('climbing_routes_map.html')
    print("Map saved successfully as 'climbing_routes_map.html'.")
except Exception as e:
    print(f"Error saving the map: {e}")
