export const shipments = [
  {
    id: "VC-1024",
    product: "Pharmaceutical Batch",
    productId: "PH-88421",
    manufacturer: "Apex Pharma",
    distributor: "Gulf Med Distribution",
    origin: "Mumbai, India",
    destination: "Dubai, UAE",
    status: "IN_TRANSIT",
    verification: "VERIFIED",
    escrow: "FUNDED",
    payment: "LOCKED",
    value: "₹250,000",
    updated: "12 min ago",
  },
  {
    id: "VC-1023",
    product: "Electronic Components",
    productId: "EC-77312",
    manufacturer: "Nova Electronics",
    distributor: "SG Components",
    origin: "Delhi, India",
    destination: "Singapore",
    status: "DELIVERED",
    verification: "VERIFIED",
    escrow: "RELEASED",
    payment: "COMPLETED",
    value: "₹480,000",
    updated: "34 min ago",
  },
  {
    id: "VC-1022",
    product: "Industrial Equipment",
    productId: "IE-44102",
    manufacturer: "Vertex Industries",
    distributor: "Rotterdam Industrial",
    origin: "Pune, India",
    destination: "Rotterdam, Netherlands",
    status: "CHECKPOINT",
    verification: "PENDING",
    escrow: "FUNDED",
    payment: "LOCKED",
    value: "₹720,000",
    updated: "1 hr ago",
  },
  {
    id: "VC-1021",
    product: "Medical Devices",
    productId: "MD-33182",
    manufacturer: "MedTech India",
    distributor: "London Health Supply",
    origin: "Bangalore, India",
    destination: "London, UK",
    status: "ANOMALY",
    verification: "FLAGGED",
    escrow: "FROZEN",
    payment: "FROZEN",
    value: "₹390,000",
    updated: "2 hrs ago",
  },
];

export const checkpoints = [
  {
    location: "Mumbai Manufacturing Facility",
    type: "ORIGIN",
    status: "VERIFIED",
    time: "06 Sep · 08:42",
  },
  {
    location: "Mumbai Logistics Hub",
    type: "HANDOVER",
    status: "VERIFIED",
    time: "06 Sep · 10:15",
  },
  {
    location: "Jebel Ali Port",
    type: "CUSTOMS",
    status: "PENDING",
    time: "07 Sep · Expected",
  },
  {
    location: "Dubai Distribution Center",
    type: "DESTINATION",
    status: "PENDING",
    time: "08 Sep · Expected",
  },
];

export const custodyTransfers = [
  {
    from: "Apex Pharma",
    to: "Mumbai Logistics",
    time: "06 Sep · 10:15",
    verified: true,
  },
  {
    from: "Mumbai Logistics",
    to: "Ocean Freight Partner",
    time: "06 Sep · 14:30",
    verified: true,
  },
  {
    from: "Ocean Freight Partner",
    to: "Gulf Med Distribution",
    time: "08 Sep · Expected",
    verified: false,
  },
];

export const anomalies = [
  {
    id: "AN-042",
    shipment: "VC-1021",
    type: "NFC Mismatch",
    severity: "HIGH",
    description: "NFC identity does not match registered product.",
    time: "2 hrs ago",
  },
  {
    id: "AN-041",
    shipment: "VC-1018",
    type: "Temperature",
    severity: "MEDIUM",
    description: "Temperature exceeded configured threshold.",
    time: "5 hrs ago",
  },
];

export const activity = [
  {
    title: "Agent verification completed",
    shipment: "VC-1024",
    time: "12 min ago",
  },
  {
    title: "Escrow funded",
    shipment: "VC-1024",
    time: "18 min ago",
  },
  {
    title: "Custody transferred",
    shipment: "VC-1023",
    time: "34 min ago",
  },
  {
    title: "Checkpoint verified",
    shipment: "VC-1022",
    time: "1 hr ago",
  },
  {
    title: "Anomaly detected",
    shipment: "VC-1021",
    time: "2 hrs ago",
  },
];