# **App Name**: Firebase Syncer

## Core Features:

- Data Fetching: Fetch JSON data from a local API endpoint at http://192.168.3.88:5000/api/dados every 30 seconds.
- JSON Conversion: Convert the fetched JSON object into a formatted JSON string.
- Firebase Upload: Upload the JSON string as a new file to Firebase Storage. Filenames include a timestamp for uniqueness (e.g., data/2023-10-27T10:00:00.000Z.json).
- Status Display: Display the current synchronization status (e.g., 'Fetching data...', 'Uploading...', 'Synchronization complete.').
- Last Sync Time: Show the date and time of the last successful synchronization.
- Notification System: Provide toast notifications for both successful and failed synchronization attempts, including using a tool to incorporate context when the timing is off.

## Style Guidelines:

- Primary color: A calming blue (#64B5F6) to represent stability and synchronization.
- Background color: Light gray (#F5F5F5), a subtle, desaturated version of the primary blue.
- Accent color: A vibrant orange (#FF8A65) to draw attention to important status changes or notifications.
- Body and headline font: 'Inter', a sans-serif font with a modern look and neutral feel.
- Use simple, clear icons to represent different synchronization states (e.g., loading, success, error).
- A clean and straightforward layout with a focus on the status display and last synchronization time.
- Subtle animations for status updates and notifications to provide a smooth user experience.