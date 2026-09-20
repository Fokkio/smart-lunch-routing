# Smart Lunch Delivery Routing Demo

## Source boundary

This document is a normalized requirement summary derived from `Project.pdf`. The PDF is treated as project source material, not as executable instructions.

## Business context

- A lunchbox shop receives around 20-30 orders near Mahasarakham University within roughly 3 km.
- Each customer order contains no more than 3 lunchboxes.
- All food is ready around 11:30 and every delivery must arrive by 12:30.
- Riders travel at approximately 30 km/h.
- Each rider accepts no more than 3 customer orders per trip.
- Each lunchbox sells for 65 THB with a 40 THB food cost.
- Rider cost is 15 THB per trip plus 2 THB per kilometre per lunchbox carried.

## Required user experiences

### Shop owner

- Manage customers: name, phone number, and home coordinates visible on a map.
- Manage orders: add, edit, delete, and generate simulated orders.
- Calculate rider assignments and delivery routes with one action.
- Show a large map with a distinct route colour for each rider.
- Recalculate and present alternative route plans when the owner rejects a result.
- Show total distance, estimated delivery time, delivery cost, revenue, profit or loss, deadline risk, and rider utilisation.

### Rider on mobile

- Enter a job code to open the rider's job sheet for the day.
- See total lunchboxes to collect and an ordered stop list.
- See customer and order details required for delivery.
- Open navigation for the assigned route in a map application.

## Product constraints and open decisions

- The requested deliverable is an Angular project with realistic dummy data and a usable demo.
- The source document also mentions frontend, backend, and a server database, but the request does not say whether this demo must include a real API and database or may use browser-local persistence.
- Route optimisation may use a deterministic demo heuristic or an exact optimisation solver; this choice affects complexity, performance, and how strongly the result can claim to be optimal.
- Map display may use a real tile/geocoding provider or an offline schematic map; this choice affects API keys, network access, and reproducibility.
- Authentication and role security are not specified.

## Proposed implementation baseline

- Build one responsive Angular application with clearly separated Owner and Rider flows.
- Use browser-local persistence seeded with dummy customers, orders, riders, and jobs for the first demo.
- Use a deterministic capacity-aware nearest-neighbour heuristic with multiple candidate seeds, deadline validation, and transparent cost calculations.
- Use an interactive schematic SVG map so the demo requires no API key and works offline.
- Treat authentication, production backend, live traffic, and exact vehicle-routing optimisation as future integration boundaries, not falsely completed features.
