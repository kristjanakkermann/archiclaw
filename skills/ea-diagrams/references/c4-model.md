# C4 Model Mermaid Patterns

## C4 Level 1 - System Context Diagram

Shows the system under design, its users, and external system dependencies.

```mermaid
C4Context
  title System Context Diagram - Internet Banking System

  Person(customer, "Banking Customer", "A customer of the bank")
  Person(support, "Support Staff", "Internal bank support")

  System(bankingSystem, "Internet Banking System", "Allows customers to view balances and make payments")

  System_Ext(emailSystem, "E-mail System", "Microsoft Exchange")
  System_Ext(mainframe, "Mainframe Banking System", "Stores core banking data")

  Rel(customer, bankingSystem, "Views balances, makes payments")
  Rel(support, bankingSystem, "Manages customer accounts")
  Rel(bankingSystem, emailSystem, "Sends notifications", "SMTP")
  Rel(bankingSystem, mainframe, "Gets account info, makes payments", "XML/HTTPS")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## C4 Level 2 - Container Diagram

Zooms into a system to show its containers (applications, data stores, etc.).

```mermaid
C4Container
  title Container Diagram - Internet Banking System

  Person(customer, "Banking Customer", "A customer of the bank")

  System_Boundary(banking, "Internet Banking System") {
    Container(webapp, "Web Application", "Java/Spring MVC", "Delivers static content and the SPA")
    Container(spa, "Single-Page App", "JavaScript/React", "Provides banking functionality via browser")
    Container(mobileApp, "Mobile App", "React Native", "Provides banking functionality via mobile")
    Container(api, "API Application", "Java/Spring Boot", "Provides banking functionality via JSON/HTTPS API")
    ContainerDb(db, "Database", "PostgreSQL", "Stores user data, transactions, credentials")
    ContainerQueue(mq, "Message Bus", "RabbitMQ", "Async event processing")
  }

  System_Ext(emailSystem, "E-mail System", "Microsoft Exchange")
  System_Ext(mainframe, "Mainframe", "Core banking system")

  Rel(customer, webapp, "Visits", "HTTPS")
  Rel(customer, spa, "Uses", "HTTPS")
  Rel(customer, mobileApp, "Uses")
  Rel(webapp, spa, "Delivers")
  Rel(spa, api, "Makes API calls", "JSON/HTTPS")
  Rel(mobileApp, api, "Makes API calls", "JSON/HTTPS")
  Rel(api, db, "Reads/writes", "SQL/TCP")
  Rel(api, mq, "Publishes events", "AMQP")
  Rel(mq, emailSystem, "Sends emails", "SMTP")
  Rel(api, mainframe, "Gets account info", "XML/HTTPS")
```

## C4 Level 3 - Component Diagram

Shows the internal components of a container.

```mermaid
C4Component
  title Component Diagram - API Application

  Container_Boundary(api, "API Application") {
    Component(authCtrl, "Auth Controller", "Spring MVC Controller", "Handles authentication requests")
    Component(accountCtrl, "Account Controller", "Spring MVC Controller", "Provides account information")
    Component(paymentCtrl, "Payment Controller", "Spring MVC Controller", "Handles payment requests")
    Component(authSvc, "Auth Service", "Spring Bean", "Authenticates users and manages sessions")
    Component(accountSvc, "Account Service", "Spring Bean", "Account logic and validation")
    Component(paymentSvc, "Payment Service", "Spring Bean", "Payment processing and validation")
    Component(mainframeGw, "Mainframe Gateway", "Spring Bean", "Communicates with core banking")
    Component(emailGw, "Email Gateway", "Spring Bean", "Sends notification emails")
  }

  ContainerDb(db, "Database", "PostgreSQL", "Stores credentials and sessions")
  System_Ext(mainframe, "Mainframe", "Core banking")
  System_Ext(email, "Email System", "Exchange")

  Rel(authCtrl, authSvc, "Uses")
  Rel(accountCtrl, accountSvc, "Uses")
  Rel(paymentCtrl, paymentSvc, "Uses")
  Rel(authSvc, db, "Reads/writes", "SQL")
  Rel(accountSvc, mainframeGw, "Uses")
  Rel(paymentSvc, mainframeGw, "Uses")
  Rel(paymentSvc, emailGw, "Uses")
  Rel(mainframeGw, mainframe, "Calls", "XML/HTTPS")
  Rel(emailGw, email, "Sends via", "SMTP")
```

## C4 Level 4 - Deployment Diagram

Shows how containers are mapped to infrastructure.

```mermaid
C4Deployment
  title Deployment Diagram - Internet Banking (Production)

  Deployment_Node(cdn, "CDN", "CloudFront") {
    Container(staticAssets, "Static Assets", "S3", "HTML, CSS, JS bundles")
  }

  Deployment_Node(aws, "AWS", "us-east-1") {
    Deployment_Node(eks, "EKS Cluster", "Kubernetes") {
      Deployment_Node(webPod, "Web Pods", "x3 replicas") {
        Container(webApp, "Web Application", "Java/Spring", "Serves SPA and handles requests")
      }
      Deployment_Node(apiPod, "API Pods", "x5 replicas") {
        Container(apiApp, "API Application", "Java/Spring Boot", "Business logic and API")
      }
    }
    Deployment_Node(rds, "RDS", "Multi-AZ") {
      ContainerDb(db, "Database", "PostgreSQL 15", "Primary + read replicas")
    }
    Deployment_Node(mqNode, "Amazon MQ", "Active/Standby") {
      ContainerQueue(mq, "Message Bus", "RabbitMQ", "Event processing")
    }
  }

  Rel(cdn, webApp, "Routes to", "HTTPS")
  Rel(webApp, apiApp, "Calls", "HTTPS")
  Rel(apiApp, db, "Reads/writes", "SQL/TLS")
  Rel(apiApp, mq, "Publishes", "AMQP/TLS")
```

## Microservices Landscape (C4 Context variant)

```mermaid
C4Context
  title Microservices Landscape - E-Commerce Platform

  Person(buyer, "Buyer", "Purchases products online")
  Person(seller, "Seller", "Lists and manages products")
  Person(ops, "Operations", "Monitors and manages platform")

  Enterprise_Boundary(platform, "E-Commerce Platform") {
    System(catalog, "Catalog Service", "Product listings, search, categories")
    System(orders, "Order Service", "Order management and fulfillment")
    System(payments, "Payment Service", "Payment processing and refunds")
    System(users, "User Service", "Authentication and user profiles")
    System(notifications, "Notification Service", "Email, SMS, push notifications")
    System(analytics, "Analytics Service", "Business intelligence and reporting")
  }

  System_Ext(stripe, "Stripe", "Payment processing")
  System_Ext(warehouse, "Warehouse System", "Inventory and shipping")
  System_Ext(sendgrid, "SendGrid", "Email delivery")

  Rel(buyer, catalog, "Browses products")
  Rel(buyer, orders, "Places orders")
  Rel(seller, catalog, "Manages listings")
  Rel(ops, analytics, "Views reports")
  Rel(orders, payments, "Processes payment", "gRPC")
  Rel(payments, stripe, "Charges card", "HTTPS")
  Rel(orders, warehouse, "Fulfills order", "HTTPS")
  Rel(notifications, sendgrid, "Sends email", "HTTPS")
  Rel(orders, notifications, "Triggers notifications", "Kafka")
  Rel(catalog, analytics, "Sends events", "Kafka")
```

## Tips

- Use `Person()` for human actors, `System()` for internal systems, `System_Ext()` for external
- Use `Container()` for applications, `ContainerDb()` for databases, `ContainerQueue()` for queues
- Use `Component()` for code-level components inside a container
- Use `System_Boundary()`, `Container_Boundary()`, `Enterprise_Boundary()` to group related elements
- Use `Deployment_Node()` to represent infrastructure (servers, clusters, cloud regions)
- Always include a `title` for context
- Describe relationships with verb phrases: "Reads from", "Sends to", "Authenticates via"
- Include technology in the relationship label when relevant: `"JSON/HTTPS"`, `"SQL/TCP"`
