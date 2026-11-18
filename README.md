# Two Tickets · Vietnam Couple Trip Planner

A responsive, buildless website for a six-day Sapa, Da Nang and Hoi An trip.

## Use locally

Open `index.html`, or serve the folder with `python3 -m http.server 8000` and open http://localhost:8000.

## Deploy with GitHub Pages

In this repository, open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, select **main** and **/ (root)**, and save. The default address will be https://geordie-og.github.io/trip_planner/ once GitHub finishes publishing. You can also deploy this directory directly with any static host. No build command or dependencies are needed.

## Features

- Six editable days with activity times and notes
- Departure date and countdown
- Expense tracker in THB with editable total budget
- Flight, hotel, transfer and activity booking records
- Packing and preparation checklist
- Automatically saved notes
- Full itinerary, expenses, bookings, checklist and notes in the print/PDF layout
- JSON backup export/import with input validation

Click **Print / Save PDF**, then choose **Save as PDF** in your browser's print destination. A4 is recommended. You can turn browser headers and footers off for a cleaner document.

## Saving and sharing

Data is stored in the current browser's local storage, separately for each origin. There is no account or shared server database. Your girlfriend's device will not sync automatically. Use **Export backup** and **Import** to transfer the complete plan; import replaces the current plan. Keep backups before changing devices, clearing browser data or moving to a new host. The save indicator reports storage failures.

The site source is public if this repository or deployment is public, but your entered browser-local data is not uploaded by the app. Don't enter passport numbers, payment details or passwords. The destination photo and optional fonts load from external providers. The app remains usable with system fonts or without the photo.

All itinerary times and the initial budget are planning examples, not confirmed bookings, live prices or travel advice. Set your dates and check transfers, flights, weather and entry requirements before paying.
