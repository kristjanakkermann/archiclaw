# SAP ERP (FIN-APP-001)

Core enterprise resource planning system handling financial accounting (FI), controlling (CO), materials management (MM), and sales & distribution (SD). This is the backbone of the organization's financial operations and has been in production since 2012.

## Key Facts

- **SAP ECC 6.0** on HANA DB, hosted on-premise in the primary data center
- Handles all general ledger, accounts payable/receivable, and cost center accounting
- Integrates with Workday HR via RFC for payroll and employee cost allocation
- Feeds financial data to SAP BPC for planning and consolidation

## Criticality

This is a **Tier 1** system. Any downtime directly impacts financial close, vendor payments, and regulatory reporting. SOX controls mandate strict change management procedures.

## Known Risks

- SAP ECC 6.0 mainstream maintenance ends 2027
- S/4HANA migration planning is in progress
- Complex RFC interfaces to legacy systems create migration coupling
