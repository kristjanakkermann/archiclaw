# Enterprise Architecture Patterns

## TOGAF Architecture Views

### Business Architecture - Process Flow

```mermaid
flowchart TD
  subgraph Trigger["Trigger Events"]
    T1[Customer Request]
    T2[Scheduled Job]
  end

  subgraph Process["Order Fulfillment Process"]
    P1[Receive Order] --> P2{Validate Order}
    P2 -->|Valid| P3[Check Inventory]
    P2 -->|Invalid| P9[Reject Order]
    P3 --> P4{In Stock?}
    P4 -->|Yes| P5[Reserve Stock]
    P4 -->|No| P10[Backorder]
    P5 --> P6[Process Payment]
    P6 --> P7[Ship Order]
    P7 --> P8[Send Confirmation]
  end

  subgraph Systems["Supporting Systems"]
    S1[(Inventory DB)]
    S2[Payment Gateway]
    S3[Shipping Provider]
    S4[Email Service]
  end

  T1 --> P1
  T2 --> P1
  P3 -.-> S1
  P6 -.-> S2
  P7 -.-> S3
  P8 -.-> S4
```

### Application Architecture - Integration Map

```mermaid
flowchart LR
  subgraph Frontend["Frontend Layer"]
    F1[Web Portal]
    F2[Mobile App]
    F3[Partner Portal]
  end

  subgraph Gateway["API Gateway"]
    G1[Kong / API Gateway]
  end

  subgraph Services["Service Layer"]
    S1[Customer Service]
    S2[Product Service]
    S3[Order Service]
    S4[Pricing Service]
    S5[Notification Service]
  end

  subgraph Data["Data Layer"]
    D1[(Customer DB)]
    D2[(Product DB)]
    D3[(Order DB)]
    D4[(Cache)]
  end

  subgraph Integration["Integration Layer"]
    I1[ESB / Event Bus]
    I2[ETL Pipeline]
  end

  subgraph External["External Systems"]
    E1[CRM]
    E2[ERP]
    E3[Payment Provider]
  end

  F1 & F2 & F3 --> G1
  G1 --> S1 & S2 & S3 & S4
  S1 --> D1
  S2 --> D2
  S3 --> D3
  S1 & S2 --> D4
  S3 --> S5
  S3 --> I1
  I1 --> E1 & E2
  S3 --> E3
  I2 --> D1 & D2 & D3
```

### Technology Architecture - Stack Diagram

```mermaid
flowchart TB
  subgraph Presentation["Presentation Tier"]
    direction LR
    CDN[CDN / CloudFront]
    LB[Load Balancer / ALB]
    WAF[WAF]
  end

  subgraph Application["Application Tier"]
    direction LR
    K8S[Kubernetes Cluster]
    SVC[Microservices]
    CACHE[Redis Cache]
  end

  subgraph Data["Data Tier"]
    direction LR
    PG[(PostgreSQL)]
    ES[(Elasticsearch)]
    S3[(Object Storage)]
  end

  subgraph Platform["Platform Services"]
    direction LR
    MQ[Message Queue]
    LOG[Logging / ELK]
    MON[Monitoring / Prometheus]
    VAULT[Secrets / Vault]
  end

  Presentation --> Application
  Application --> Data
  Application --> Platform
```

## Data Architecture

### Data Flow Diagram

```mermaid
flowchart LR
  subgraph Sources["Data Sources"]
    S1[Web App Events]
    S2[Mobile App Events]
    S3[IoT Sensors]
    S4[Third-Party APIs]
  end

  subgraph Ingestion["Ingestion Layer"]
    K[Kafka / Event Hub]
  end

  subgraph Processing["Processing Layer"]
    SP[Stream Processing<br/>Flink / Spark]
    BP[Batch Processing<br/>Airflow / dbt]
  end

  subgraph Storage["Storage Layer"]
    DL[(Data Lake<br/>S3 / ADLS)]
    DW[(Data Warehouse<br/>Snowflake / BigQuery)]
  end

  subgraph Serving["Serving Layer"]
    BI[BI Dashboard<br/>Tableau / Looker]
    API[Data API<br/>REST / GraphQL]
    ML[ML Models<br/>SageMaker]
  end

  S1 & S2 & S3 & S4 --> K
  K --> SP
  SP --> DL
  DL --> BP
  BP --> DW
  DW --> BI & API
  DL --> ML
```

### Entity Relationship - Domain Model

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  CUSTOMER {
    uuid id PK
    string name
    string email UK
    enum tier "bronze, silver, gold"
  }
  ORDER ||--|{ ORDER_LINE : contains
  ORDER {
    uuid id PK
    uuid customer_id FK
    datetime created_at
    enum status "pending, confirmed, shipped, delivered"
    decimal total_amount
  }
  ORDER_LINE }|--|| PRODUCT : references
  ORDER_LINE {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    decimal unit_price
  }
  PRODUCT ||--o{ PRODUCT_CATEGORY : "belongs to"
  PRODUCT {
    uuid id PK
    string name
    string sku UK
    decimal price
    int stock_count
  }
  PRODUCT_CATEGORY }|--|| CATEGORY : references
  CATEGORY {
    uuid id PK
    string name
    uuid parent_id FK "self-referencing"
  }
```

## Integration Architecture

### Event-Driven Architecture

```mermaid
sequenceDiagram
  participant UI as Web UI
  participant API as API Gateway
  participant OS as Order Service
  participant EB as Event Bus
  participant PS as Payment Service
  participant IS as Inventory Service
  participant NS as Notification Service

  UI->>API: POST /orders
  API->>OS: Create order
  OS->>OS: Validate order
  OS->>EB: OrderCreated event

  par Payment Processing
    EB->>PS: OrderCreated
    PS->>PS: Process payment
    PS->>EB: PaymentCompleted
  and Inventory Reservation
    EB->>IS: OrderCreated
    IS->>IS: Reserve stock
    IS->>EB: StockReserved
  end

  EB->>OS: PaymentCompleted + StockReserved
  OS->>OS: Confirm order
  OS->>EB: OrderConfirmed
  EB->>NS: OrderConfirmed
  NS->>NS: Send confirmation email
```

### API Gateway Pattern

```mermaid
flowchart TB
  subgraph Clients
    C1[Web App]
    C2[Mobile App]
    C3[Partner API]
  end

  subgraph Gateway["API Gateway"]
    AUTH[Authentication]
    RATE[Rate Limiting]
    ROUTE[Routing]
    CACHE[Response Cache]
    TRANSFORM[Request Transform]
  end

  subgraph Backend["Backend Services"]
    S1[User Service<br/>:8001]
    S2[Product Service<br/>:8002]
    S3[Order Service<br/>:8003]
    S4[Search Service<br/>:8004]
  end

  C1 & C2 & C3 --> AUTH
  AUTH --> RATE
  RATE --> ROUTE
  ROUTE --> CACHE
  CACHE --> TRANSFORM
  TRANSFORM --> S1 & S2 & S3 & S4
```

## Solution Architecture

### Cloud-Native Architecture

```mermaid
flowchart TB
  subgraph Internet
    USER[Users / Clients]
  end

  subgraph Edge["Edge / CDN"]
    CF[CloudFront]
    R53[Route 53]
  end

  subgraph VPC["VPC"]
    subgraph Public["Public Subnet"]
      ALB[Application<br/>Load Balancer]
      NAT[NAT Gateway]
    end

    subgraph Private["Private Subnet"]
      subgraph EKS["EKS Cluster"]
        SVC1[Service A<br/>3 pods]
        SVC2[Service B<br/>3 pods]
        SVC3[Service C<br/>2 pods]
      end
    end

    subgraph Data["Data Subnet"]
      RDS[(RDS Aurora<br/>Multi-AZ)]
      EC[(ElastiCache<br/>Redis)]
      MQ[Amazon MQ]
    end
  end

  subgraph Managed["Managed Services"]
    S3[(S3)]
    SQS[SQS]
    SNS[SNS]
    CW[CloudWatch]
  end

  USER --> R53 --> CF --> ALB
  ALB --> SVC1 & SVC2 & SVC3
  SVC1 & SVC2 --> RDS
  SVC1 --> EC
  SVC2 --> MQ
  SVC3 --> S3
  MQ --> SQS
  SQS --> SNS
  EKS --> CW
```

### Microservices State Machine

```mermaid
stateDiagram-v2
  [*] --> Pending: Order placed

  Pending --> Validating: Validate
  Validating --> PaymentProcessing: Valid
  Validating --> Rejected: Invalid

  PaymentProcessing --> Paid: Payment success
  PaymentProcessing --> PaymentFailed: Payment error

  PaymentFailed --> PaymentProcessing: Retry
  PaymentFailed --> Cancelled: Max retries

  Paid --> Fulfilling: Begin fulfillment
  Fulfilling --> Shipped: Package dispatched
  Shipped --> Delivered: Delivery confirmed

  Delivered --> [*]
  Rejected --> [*]
  Cancelled --> [*]

  Paid --> Refunding: Refund requested
  Shipped --> Refunding: Return initiated
  Refunding --> Refunded: Refund processed
  Refunded --> [*]
```

## ArchiMate Layers (via Flowchart)

Mermaid does not have native ArchiMate support, but the three-layer model can be
represented with subgraph nesting.

```mermaid
flowchart TB
  subgraph Business["Business Layer"]
    direction LR
    BA1[Customer Management]
    BA2[Order Processing]
    BA3[Product Management]
    BA1 --> BA2
    BA2 --> BA3
  end

  subgraph Application["Application Layer"]
    direction LR
    AA1[CRM Application]
    AA2[Order Engine]
    AA3[Catalog Service]
    AA4[Analytics Platform]
    AA1 --> AA2
    AA2 --> AA3
    AA3 --> AA4
  end

  subgraph Technology["Technology Layer"]
    direction LR
    TA1[Kubernetes Cluster]
    TA2[(PostgreSQL)]
    TA3[(Redis)]
    TA4[Kafka]
    TA1 --> TA2 & TA3
    TA1 --> TA4
  end

  Business --> Application
  Application --> Technology
```

## Tips for Enterprise Diagrams

- Use subgraphs to represent architectural boundaries and layers
- Use `direction LR` or `direction TB` within subgraphs for layout control
- Use dashed arrows (`-.->`) for async/event-driven relationships
- Use thick arrows (`==>`) for primary/critical paths
- Use notes and labels to indicate protocols and technologies
- Keep color coding consistent: same color = same architectural concern
