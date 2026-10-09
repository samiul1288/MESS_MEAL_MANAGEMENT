# MessMate — Entity-Relationship Diagram

## Overview

```mermaid
erDiagram
    USERS ||--o{ MEMBERS : "belongs to mess_group"
    USERS ||--o{ MEALS : "created_by"
    USERS ||--o{ BAZAR_EXPENSES : "created_by"
    USERS ||--o| NOTICES : "created_by"
    USERS ||--o| MESS_GROUPS : "manages"
    
    MESS_GROUPS ||--o{ MEMBERS : "contains"
    MESS_GROUPS ||--o{ MEALS : "serves"
    MESS_GROUPS ||--o{ BAZAR_EXPENSES : "incurs"
    MESS_GROUPS ||--o{ PAYMENTS : "collects"
    MESS_GROUPS ||--o{ NOTICES : "posts"
    
    MEMBERS ||--o{ PAYMENTS : "makes"
    
    MEALS {
        int id PK
        int mess_group_id FK
        date meal_date
        varchar(20) meal_type
        text menu_items
        int quantity
        numeric(10,2) cost_per_head
        numeric(10,2) total_cost
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    MEMBERS {
        int id PK
        int mess_group_id FK
        varchar(20) roll_number UK
        varchar(100) name
        varchar(50) hall
        varchar(20) room
        varchar(20) batch
        varchar(15) phone
        varchar(100) email
        varchar(20) status
        timestamp created_at
        timestamp updated_at
    }
    
    MESS_GROUPS {
        int id PK
        varchar(100) name
        varchar(20) code UK
        text description
        int manager_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    USERS {
        int id PK
        varchar(50) username UK
        varchar(100) email UK
        varchar(255) password_hash
        varchar(100) full_name
        varchar(20) role
        int mess_group_id FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    BAZAR_EXPENSES {
        int id PK
        int mess_group_id FK
        date expense_date
        varchar(30) category
        text description
        numeric(10,2) amount
        varchar(100) vendor
        varchar(30) payment_method
        text notes
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    PAYMENTS {
        int id PK
        int member_id FK
        int mess_group_id FK
        varchar(7) payment_month UK
        numeric(10,2) amount
        date payment_date
        varchar(30) payment_method
        varchar(20) status
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    NOTICES {
        int id PK
        int mess_group_id FK
        varchar(200) title
        text content
        boolean is_pinned
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }
```

## Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| **users** → **mess_groups** | 1:N | A user manages a mess group (manager role) |
| **users** → **members** | 1:N | Users may be associated with members |
| **users** → **meals** | 1:N | Users create meal records |
| **users** → **bazar_expenses** | 1:N | Users create expense records |
| **users** → **notices** | 1:N | Users create notices |
| **mess_groups** → **members** | 1:N | A mess group contains many members |
| **mess_groups** → **meals** | 1:N | A mess group serves many meals |
| **mess_groups** → **bazar_expenses** | 1:N | A mess group incurs many expenses |
| **mess_groups** → **payments** | 1:N | A mess group collects many payments |
| **mess_groups** → **notices** | 1:N | A mess group posts many notices |
| **members** → **payments** | 1:N | A member makes many payments |
| **meals** → **meals** | 1:N | A mess group has many meals |

## Cardinality Rules

- **1:N (One-to-Many)**: The most common relationship type in the schema
  - One mess_group has many members/meals/expenses/notices/payments
  - One member belongs to one mess_group
  - One user may manage one mess_group or none (NULL allowed)

- **M:N → Resolved via 1:N**: All many-to-many relationships are resolved
  - No direct M:N relationships exist; each relationship is resolved to a 1:N
