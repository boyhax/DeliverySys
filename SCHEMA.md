# ShipControl Database Schema & Architecture

This document outlines the database structure and core logistics engine logic for the ShipControl platform.

## 1. Core Logistics Entities

### `shipping_methods`
Defines the types of transport available.
- `id`: Unique identifier (UUID).
- `name`: Plane, Ship, Truck, etc.
- `base_cost`: Default handling fee.
- `cost_per_kg`: Global weight multiplier.
- `cost_per_m2`: Global volume multiplier.

### `shipping_regions`
Geographic zones used for routing.
- `id`: Unique identifier.
- `name`: Region name (e.g., North America).
- `country_code`: ISO 3166-1 alpha-2 code.

### `shipping_method_region_matrix` (The "Price Engine")
The core relational table that calculates quotes based on route and method.
- `id`: Unique identifier.
- `from_region_id`: Origin (FK).
- `to_region_id`: Destination (FK).
- `shipping_method_id`: Transport type (FK).
- `base_cost_override`: Optional override for specific routes.
- `cost_per_kg_override`: Optional weight override.
- `cost_per_m2_override`: Optional volume override.

## 2. Fulfillment & Providers

### `shipping_providers`
External courier services that execute deliveries.
- `id`: Unique identifier.
- `name`: e.g., GlobalFreight, AeroPort.
- `type`: air, sea, land.
- `status`: active, suspended.

### `shipping_provider_eligibility`
Connects specific providers to valid routes in the matrix.
- `provider_id`: Reference to provider.
- `matrix_id`: Reference to a specific method-route pair.
- `is_active`: Boolean status for seasonal or restricted access.

### `shipping_strategies`
Defines priority logic for selecting providers.
- `matrix_id`: The route this strategy applies to.
- `strategy_type`: `cheapest`, `fastest`, `nearest`.
- `priority`: Execution order.

## 3. Operations & Users

### `users`
System accounts and business clients.
- `id`: Unique identifier.
- `role`: `admin`, `manager`, `client`.
- `status`: `active`, `inactive`.

### `orders`
Specific shipments processed by the engine.
- `tracking_id`: Human-readable identifier.
- `destination`: Destination string.
- `cost`: Final calculated quote.
- `status`: `Pending`, `In Transit`, `Delivered`.

## 4. Logical Flow
1. **Quote Phase**: User submits dimensions and route. Server queries the `matrix` for eligible `shipping_methods`.
2. **Strategy Phase**: Server checks `shipping_strategies` for the selected matrix entry.
3. **Provider Assignment**: Server verifies `shipping_provider_eligibility` to ensure the courier can handle the specific method and route.
4. **Order Creation**: Record is saved in `orders` with the final calculated cost.
