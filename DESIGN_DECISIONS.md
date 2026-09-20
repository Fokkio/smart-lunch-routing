# Smart Lunch Delivery — Design Decisions

## Source authority

- Open question: When `Project.pdf` conflicts with `D:\Angular\06-Project\Project.md`, should the attached PDF be authoritative or should the older Angular Vault brief override it?
- Dependency: Data models, rider capacity, costing, profitability, and rider access all depend on this choice.

## Demo architecture

- Choice: Use a browser-local Angular demo or include a real backend and server database.
- Trade-off: Browser-local persistence is fast and reproducible, while a real backend better matches the document but expands delivery and setup risk.

## Map implementation

- Choice: Use an offline interactive schematic SVG map or a real online map provider.
- Trade-off: An offline map needs no API key, while a real map offers familiar roads and navigation but depends on network access and provider terms.

## Route calculation

- Choice: Use a transparent deterministic heuristic or an exact optimisation solver.
- Trade-off: A heuristic is suitable for a usable demo, while an exact solver adds complexity and still needs careful modelling before claiming optimality.

## Rider access

- Choice: Use the PDF job-code flow or the Angular Vault login flow.
- Dependency: Authentication scope depends on the selected source authority and demo architecture.

## Delivery location

- Open question: Should the new isolated Angular app live in `D:\AdvanceWebProject` or as a new untouched sibling folder under `D:\Angular`?
- Dependency: Project setup and source-preservation checks depend on the destination.
