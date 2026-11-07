export const DEMO_MAP_CONFIG = {
  initialCenter: [27.2850, 88.5650],                                                     
  initialZoom: 13,                                                                 
  minZoom: 3,
  maxZoom: 19
};
export const DEMO_META = {
  incidentCount: 4,
  criticalAlerts: 2,
  shelterCount: 2,
  hospitalCount: 2,
  deployedResources: 3,
  blockedRoadCount: 1,
  isolatedVillages: 1,
  sector: "NER-SIKKIM-01",
  region: "East Sikkim / NH-10 Teesta Valley Corridor",
  rainfallSeverity: "VERY HEAVY (142 mm / 24h)",
  timestamp: "2026-08-31T18:00:00Z"
};
export const DEMO_INCIDENTS = [
  {
    id: "INC-LS-101",
    title: "Major Rockfall & Highway Severance at Km 32",
    type: "Landslide",
    severity: "Critical",
    location: {
      lat: 27.2530,
      lng: 88.5380,
      address: "NH-10 Teesta Valley Highway, Near Milepost 32"
    },
    status: "Active",
    impactScore: 96,
    affectedRadiusM: 850,
    reportedAt: "2026-08-31T17:10:00Z",
    affectedPopulation: 3800,
    requiredAssets: ["Heavy Earthmovers", "BRO Dozer Crew", "NDRF SAR"],
    description: "Massive rockfall and debris avalanche severed NH-10. Over 4,000 cu.m of debris blocks arterial access to Gangtok.",
    source: "NDRF Ground Recon Patrol #04",
    verificationStatus: "Verified"
  },
  {
    id: "INC-FF-201",
    title: "Teesta Flash-Flood Surge — Melli Riverfront",
    type: "Flash Flood",
    severity: "Critical",
    location: {
      lat: 27.1850,
      lng: 88.4700,
      address: "Teesta Riverbank, Melli Bazaar"
    },
    status: "Active",
    impactScore: 91,
    affectedRadiusM: 1250,
    reportedAt: "2026-08-31T18:05:00Z",
    affectedPopulation: 2600,
    requiredAssets: ["NDRF Water Rescue", "Inflatable Boats"],
    description: "Sudden Teesta discharge spike inundating the riverfront market and low-lying wards. Rapid evacuation underway.",
    source: "CWC River Gauge + SDRF",
    verificationStatus: "Verified"
  },
  {
    id: "INC-RB-301",
    title: "NH-10 Corridor Blocked — Ranipool Debris Choke",
    type: "Road Blockage",
    severity: "High",
    location: {
      lat: 27.3100,
      lng: 88.6200,
      address: "NH-10 Ranipool–Gangtok Approach"
    },
    status: "Active",
    impactScore: 78,
    affectedRadiusM: 600,
    reportedAt: "2026-08-31T17:50:00Z",
    affectedPopulation: 1400,
    requiredAssets: ["JCB Ditching Unit", "Traffic Police Convoy"],
    description: "Fallen boulders and slurry choke both lanes of NH-10; convoy movement to Gangtok halted.",
    source: "Traffic Police Control Room",
    verificationStatus: "Verified"
  },
  {
    id: "INC-SC-401",
    title: "Tension Cracks Widening — Singtam Ridge",
    type: "Slope Crack",
    severity: "Warning",
    location: {
      lat: 27.2410,
      lng: 88.5100,
      address: "Upper Singtam Terrace Slopes, Above Ward 3"
    },
    status: "Active",
    impactScore: 58,
    affectedRadiusM: 520,
    reportedAt: "2026-08-31T17:25:00Z",
    affectedPopulation: 900,
    requiredAssets: ["Geotechnical Inclinometers", "SDRF Watch Team"],
    description: "15cm tension cracks propagating across the tea-garden hillside; monitored for progressive failure.",
    source: "Gram Panchayat (Verified)",
    verificationStatus: "Verified"
  },
  {
    id: "INC-SM-501",
    title: "Active Slope Movement — Dikchu Ridge",
    type: "Slope Movement",
    severity: "High",
    location: {
      lat: 27.3650,
      lng: 88.5450,
      address: "Dikchu Ridge, North Sector"
    },
    status: "Active",
    impactScore: 74,
    affectedRadiusM: 720,
    reportedAt: "2026-08-31T18:15:00Z",
    affectedPopulation: 1100,
    requiredAssets: ["Inclinometer Array", "SDRF Evacuation Squad"],
    description: "Inclinometers register 6 cm/day downslope creep; slow-moving slump threatening the ridge hamlet.",
    source: "GSI Slope Telemetry",
    verificationStatus: "Verified"
  },
  {
    id: "INC-ID-601",
    title: "Power & Footbridge Infrastructure Damage — Rangpo",
    type: "Infrastructure Damage",
    severity: "Operational",
    location: {
      lat: 27.2050,
      lng: 88.5200,
      address: "Rangpo Feeder Line & Footbridge, Sector 2"
    },
    status: "Active",
    impactScore: 46,
    affectedRadiusM: 460,
    reportedAt: "2026-08-31T16:40:00Z",
    affectedPopulation: 700,
    requiredAssets: ["State Power Squad", "PWD Bridge Unit"],
    description: "33kV feeder line down and pedestrian footbridge decking cracked; utility crews mobilising.",
    source: "Power Grid Telemetry + PWD",
    verificationStatus: "Verified"
  }
];
export const DEMO_VILLAGES = [
  {
    id: "VILL-001",
    name: "Singtam Upper Basti",
    location: { lat: 27.2350, lng: 88.4980 },
    population: 1640,
    connectivityStatus: "Isolated",                                    
    riskLevel: "Critical",
    riskScore: 88,
    primaryAccessRoadId: "ROAD-NH10-S1",
    shelterCapacityNearby: 500,
    lastContact: "2026-08-31T17:45:00Z"
  },
  {
    id: "VILL-002",
    name: "Martam Foothill Settlement",
    location: { lat: 27.2620, lng: 88.5600 },
    population: 980,
    connectivityStatus: "Restricted",                                           
    riskLevel: "High",
    riskScore: 74,
    primaryAccessRoadId: "ROAD-BYPASS-01",
    shelterCapacityNearby: 300,
    lastContact: "2026-08-31T17:50:00Z"
  },
  {
    id: "VILL-003",
    name: "Rongli Valley Hamlet",
    location: { lat: 27.2100, lng: 88.6800 },
    population: 620,
    connectivityStatus: "Connected",
    riskLevel: "Warning",
    riskScore: 52,
    primaryAccessRoadId: "ROAD-RONGLI-01",
    shelterCapacityNearby: 800,
    lastContact: "2026-08-31T17:30:00Z"
  },
  {
    id: "VILL-004",
    name: "Dikchu Riverside Village",
    location: { lat: 27.3800, lng: 88.5350 },
    population: 1250,
    connectivityStatus: "Connected",
    riskLevel: "Warning",
    riskScore: 58,
    primaryAccessRoadId: "ROAD-DIKCHU-01",
    shelterCapacityNearby: 400,
    lastContact: "2026-08-31T17:15:00Z"
  }
];
export const DEMO_HOSPITALS = [
  {
    id: "HOSP-001",
    name: "STNM Multi-Speciality Hospital Gangtok",
    type: "Apex Disaster Referral Hospital",
    status: "Operational",
    severity: "Critical",
    location: {
      lat: 27.3250,
      lng: 88.6080,
      address: "Sochagang Enclave, Gangtok East"
    },
    totalBeds: 550,
    availableBeds: 84,
    icuBedsTotal: 60,
    icuBedsAvailable: 11,
    oxygenCapacityPct: 94,
    roadAccess: "Connected",
    helipadStatus: "Operational (LZ-01 Active)",
    contact: "+91-3592-202944 (Emergency Trauma Line)"
  },
  {
    id: "HOSP-002",
    name: "Singtam District Community Hospital",
    type: "Community Health Center (CHC)",
    status: "Operational",
    severity: "High",
    location: {
      lat: 27.2380,
      lng: 88.4950,
      address: "Hospital Road, Singtam Bazaar"
    },
    totalBeds: 120,
    availableBeds: 18,
    icuBedsTotal: 10,
    icuBedsAvailable: 2,
    oxygenCapacityPct: 82,
    roadAccess: "Blocked",                                             
    helipadStatus: "No Helipad",
    contact: "+91-3592-234212"
  }
];
export const DEMO_SHELTERS = [
  {
    id: "SHEL-001",
    name: "Rangpo Indoor Sports Complex Relief Center",
    type: "Primary Mountain Relief Hub",
    status: "Operational",
    location: {
      lat: 27.1780,
      lng: 88.5280,
      address: "NH-10 Highway Complex, Rangpo Gateway"
    },
    totalCapacity: 800,
    currentOccupancy: 460,
    foodStatus: "Adequate (5 Days Supply)",
    waterStatus: "Potable Tankers On-Site",
    powerStatus: "Grid Active + Backup Generator",
    medicalStaffCount: 12,
    contact: "Relief Officer: +91-94340-88122"
  },
  {
    id: "SHEL-002",
    name: "Singtam Community Hall Emergency Camp",
    type: "Temporary Evacuation Shelter",
    status: "Operational",
    location: {
      lat: 27.2340,
      lng: 88.5020,
      address: "Singtam Upper Ward, Near Bridge"
    },
    totalCapacity: 500,
    currentOccupancy: 385,
    foodStatus: "Replenishing via SDRF Convoys",
    waterStatus: "Filtration Unit Active",
    powerStatus: "Generator Only",
    medicalStaffCount: 6,
    contact: "Camp Coordinator: +91-98002-11450"
  }
];
export const DEMO_RESOURCES = [
  {
    id: "RES-BRO-01",
    name: "BRO Project Swastik Heavy Dozer Crew #04",
    type: "Generator",             
    status: "Deployed",
    location: {
      lat: 27.2510,
      lng: 88.5350,
      address: "NH-10 Km 32 Rockfall Clearance Zone"
    },
    personnelCount: 18,
    equipment: "2x Komatsu D155 Dozers, 1x CAT 320D Excavator, Rock Breakers",
    assignedIncidentId: "INC-LS-101",
    contactRadio: "VHF Ch 16 (BRO Ops)"
  },
  {
    id: "RES-NDRF-01",
    name: "NDRF 2nd Bn Mountain Rescue Team Alpha",
    type: "Rescue Team",
    status: "Deployed",
    location: {
      lat: 27.2320,
      lng: 88.4920,
      address: "Singtam Disaster Response Base"
    },
    personnelCount: 24,
    equipment: "High-Angle Rope Rescue Kits, Drone Recon, Life Detectors",
    assignedIncidentId: "INC-LS-102",
    contactRadio: "VHF Ch 08 (NDRF Comms)"
  },
  {
    id: "RES-AMB-01",
    name: "SDRF 4x4 High-Altitude ALS Ambulance #02",
    type: "Ambulance",
    status: "Active",
    location: {
      lat: 27.2390,
      lng: 88.4970,
      address: "Singtam Hospital Staging Zone"
    },
    personnelCount: 4,
    equipment: "Portable Ventilator, Defibrillator, Cold-Weather Trauma Kit",
    assignedIncidentId: null,
    contactRadio: "VHF Ch 12 (Emergency Medical)"
  }
];
export const DEMO_ROADS = [
  {
    id: "ROAD-NH10-S1",
    name: "NH-10 Teesta Valley Highway (Km 32 Section)",
    status: "Blocked",                                    
    trafficCondition: "NORMAL",
    blockageReason: "Severe Landslide & Rock Avalanche (4,000 cu.m debris)",
    estimatedClearance: "4.5 hrs (BRO Excavators Active)",
    coordinates: [
      [27.2350, 88.5000],
      [27.2450, 88.5200],
      [27.2530, 88.5380],                  
      [27.2620, 88.5550],
      [27.2750, 88.5720]
    ]
  },
  {
    id: "ROAD-BYPASS-01",
    name: "Western Ridge Alternate Mountain Bypass",
    status: "Restricted",                                                               
    trafficCondition: "NORMAL",
    restrictionReason: "Narrow hillside hairpin alignment; single-lane convoy control",
    estimatedClearance: "Monitored / Active Convoy Escort",
    coordinates: [
      [27.2350, 88.5000],
      [27.2480, 88.4920],
      [27.2650, 88.5120],
      [27.2820, 88.5400],
      [27.2950, 88.5680],
      [27.3080, 88.5880]
    ]
  },
  {
    id: "ROAD-GANGTOK-01",
    name: "Ranipool to STNM Hospital Gangtok Expressway Approach",
    status: "Connected",                       
    trafficCondition: "NORMAL",
    restrictionReason: null,
    estimatedClearance: "Fully Open & Operational",
    coordinates: [
      [27.3080, 88.5880],
      [27.3180, 88.5980],
      [27.3250, 88.6080]
    ]
  },
  {
    id: "ROAD-RONGLI-01",
    name: "Rongli Valley Arterial Link Road",
    status: "Connected",
    trafficCondition: "NORMAL",
    coordinates: [
      [27.2100, 88.6800],
      [27.2350, 88.6200],
      [27.2750, 88.5720]
    ]
  }
];
export const DEMO_RISK_ZONES = [
  {
    id: "RISK-LS-01",
    name: "Rangpo-Melli High-Slope Landslide Hazard Corridor",
    geometryType: "Polygon",
    riskScore: 92,
    riskLevel: "Critical",
    slopeAngleDeg: 44.5,
    rainfall24hMm: 158,
    soilSaturationPct: 92,
    primaryFactor: "Steep Slope (>40°) + Saturated Soil + Monsoon Torrent",
    threatenedVillages: ["Singtam Upper Basti", "Rongli Valley Hamlet"],
    estimatedPopulation: 2260,
    coordinates: [
      [27.2280, 88.4850],
      [27.2580, 88.5100],
      [27.2680, 88.5650],
      [27.2420, 88.5780],
      [27.2150, 88.5150]
    ]
  },
  {
    id: "RISK-LS-02",
    name: "NH-10 Km 32 Active Chute & Rockfall Susceptibility Zone",
    geometryType: "Polygon",
    riskScore: 86,
    riskLevel: "Critical",
    slopeAngleDeg: 38.0,
    rainfall24hMm: 135,
    soilSaturationPct: 84,
    primaryFactor: "Fractured Gneiss Rockface + Roadcut Undercutting",
    threatenedVillages: ["Martam Foothill Settlement"],
    estimatedPopulation: 980,
    coordinates: [
      [27.2480, 88.5250],
      [27.2680, 88.5450],
      [27.2600, 88.5700],
      [27.2380, 88.5480]
    ]
  },
  {
    id: "RISK-LS-03",
    name: "Dikchu Riverbank Slump & Mudflow Buffer",
    geometryType: "Circle",
    center: [27.3750, 88.5320],
    radius: 1100,                 
    riskScore: 68,
    riskLevel: "High",
    slopeAngleDeg: 28.5,
    rainfall24hMm: 110,
    soilSaturationPct: 76,
    primaryFactor: "Debris Inflow from Upper Mountain Stream",
    threatenedVillages: ["Dikchu Riverside Village"],
    estimatedPopulation: 1250
  }
];
export const DEMO_ROUTES = [
  {
    id: "ROUTE-01-PRIMARY",
    name: "Western Ridge Alternate Evacuation Corridor (Singtam -> STNM Hospital)",
    type: "Primary",
    status: "Recommended",
    riskLevel: "Operational",
    origin: {
      name: "Singtam Disaster Response Base",
      lat: 27.2350,
      lng: 88.4980
    },
    destination: {
      name: "STNM Multi-Speciality Hospital Gangtok",
      lat: 27.3250,
      lng: 88.6080
    },
    coordinates: [
      [27.2350, 88.4980],
      [27.2480, 88.4920],
      [27.2650, 88.5120],
      [27.2820, 88.5400],
      [27.2950, 88.5680],
      [27.3080, 88.5880],
      [27.3180, 88.5980],
      [27.3250, 88.6080]
    ],
    distanceKm: 14.2,
    distance: "14.2 km",
    freeFlowEtaMin: 26,
    trafficAwareEtaMin: 26,
    trafficDelayMin: 0,
    eta: "26 mins",
    trafficLevel: "NORMAL",
    roadStatus: "OPEN",
    source: "SIMULATED",
    lastUpdated: "2026-08-31T18:00:00Z",
    hazardsAvoided: "Bypasses NH-10 Km 32 Active Landslide Debris Zone"
  },
  {
    id: "ROUTE-02-AFFECTED",
    name: "Direct NH-10 Teesta Valley Highway (Impassable Debris Zone)",
    type: "Affected",
    status: "Blocked",
    riskLevel: "Critical",
    traversesR17: true,                                                
    origin: {
      name: "Singtam Disaster Response Base",
      lat: 27.2350,
      lng: 88.4980
    },
    destination: {
      name: "STNM Multi-Speciality Hospital Gangtok",
      lat: 27.3250,
      lng: 88.6080
    },
    coordinates: [
      [27.2350, 88.4980],
      [27.2450, 88.5200],
      [27.2530, 88.5380],                                 
      [27.2620, 88.5550],
      [27.2750, 88.5720],
      [27.3080, 88.5880],
      [27.3180, 88.5980],
      [27.3250, 88.6080]
    ],
    distanceKm: 9.4,
    distance: "9.4 km",
    freeFlowEtaMin: 14,
    trafficAwareEtaMin: 14,
    trafficDelayMin: 0,
    eta: "14 mins (IMPASSABLE)",
    trafficLevel: "NORMAL",
    roadStatus: "BLOCKED",
    source: "SIMULATED",
    lastUpdated: "2026-08-31T18:00:00Z",
    blockageReason: "Direct Corridor Severed by NH-10 Km 32 Landslide Avalanche"
  },
  {
    id: "ROUTE-03-ALT-WEST",
    name: "Rongli-Pakyong High-Altitude Alternate Corridor",
    type: "Alternative",
    status: "Available",
    riskLevel: "Warning",
    origin: {
      name: "Singtam Disaster Response Base",
      lat: 27.2350,
      lng: 88.4980
    },
    destination: {
      name: "STNM Multi-Speciality Hospital Gangtok",
      lat: 27.3250,
      lng: 88.6080
    },
    coordinates: [
      [27.2350, 88.4980],
      [27.2100, 88.6800],
      [27.2500, 88.6500],
      [27.2900, 88.6200],
      [27.3250, 88.6080]
    ],
    distanceKm: 22.5,
    distance: "22.5 km",
    freeFlowEtaMin: 42,
    trafficAwareEtaMin: 42,
    trafficDelayMin: 0,
    eta: "42 mins",
    trafficLevel: "NORMAL",
    roadStatus: "OPEN",
    source: "SIMULATED",
    lastUpdated: "2026-08-31T18:00:00Z",
    hazardsAvoided: "Completely avoids Teesta Gorge geological fault zone"
  }
];
export const DEMO_SIMULATION_SCENARIOS = {
  BASELINE: {
    id: "BASELINE",
    name: "Baseline Landslide Crisis State",
    description: "NH-10 Km 32 Severed by Landslide; Singtam Hospital road access blocked; Western Ridge Bypass active (26 mins).",
    roads: DEMO_ROADS,
    hospitals: DEMO_HOSPITALS,
    routes: DEMO_ROUTES
  },
  TRAFFIC_SPIKE: {
    id: "TRAFFIC_SPIKE",
    name: "Evacuation Traffic Surge on Western Ridge Bypass",
    description: "Civilian evacuation creates heavy bottleneck on narrow Ridge Bypass (+18m delay -> 44m). Alternative Rongli-Pakyong corridor recommended.",
    deltas: {
      routes: [
        {
          id: "ROUTE-01-PRIMARY",
          name: "Western Ridge Alternate Corridor (Congested)",
          type: "Alternative",
          status: "Available",
          riskLevel: "Warning",
          origin: { name: "Singtam Base", lat: 27.2350, lng: 88.4980 },
          destination: { name: "STNM Hospital", lat: 27.3250, lng: 88.6080 },
          coordinates: DEMO_ROUTES[0].coordinates,
          distanceKm: 14.2,
          distance: "14.2 km",
          freeFlowEtaMin: 26,
          trafficAwareEtaMin: 44,
          trafficDelayMin: 18,
          eta: "44 mins",
          trafficLevel: "HEAVY",
          roadStatus: "OPEN",
          source: "SIMULATED",
          hazardsAvoided: "Heavy civilian evacuation congestion"
        },
        {
          ...DEMO_ROUTES[1]
        },
        {
          id: "ROUTE-03-ALT-WEST",
          name: "Rongli-Pakyong High-Altitude Corridor (Free-Flow)",
          type: "Primary",
          status: "Recommended",
          riskLevel: "Operational",
          origin: { name: "Singtam Base", lat: 27.2350, lng: 88.4980 },
          destination: { name: "STNM Hospital", lat: 27.3250, lng: 88.6080 },
          coordinates: DEMO_ROUTES[2].coordinates,
          distanceKm: 22.5,
          distance: "22.5 km",
          freeFlowEtaMin: 42,
          trafficAwareEtaMin: 42,
          trafficDelayMin: 0,
          eta: "42 mins",
          trafficLevel: "NORMAL",
          roadStatus: "OPEN",
          source: "SIMULATED",
          hazardsAvoided: "Bypasses congested mountain bottleneck"
        }
      ]
    }
  },
  CLEAR_RING_ROAD_R17: {
    id: "CLEAR_RING_ROAD_R17",
    name: "BRO Heavy Clearance Completed — NH-10 Restored",
    description: "BRO Dozers clear Km 32 debris. Direct NH-10 corridor restored (14 mins); Singtam Hospital access open (2/2).",
    deltas: {
      roads: [
        {
          id: "ROAD-NH10-S1",
          status: "Connected",
          reason: "BRO Clearance Complete — 2-Way Flow Restored",
          estimatedClearance: "Fully Clear & Monitored"
        }
      ],
      hospitals: [
        {
          id: "HOSP-002",
          roadAccess: "Open",
          status: "Operational"
        }
      ],
      routes: [
        {
          id: "ROUTE-02-AFFECTED",
          name: "Direct NH-10 Teesta Valley Highway (Restored)",
          type: "Primary",
          status: "Recommended",
          riskLevel: "Operational",
          traversesR17: false,
          origin: { name: "Singtam Base", lat: 27.2350, lng: 88.4980 },
          destination: { name: "STNM Hospital", lat: 27.3250, lng: 88.6080 },
          coordinates: DEMO_ROUTES[1].coordinates,
          distanceKm: 9.4,
          distance: "9.4 km",
          freeFlowEtaMin: 14,
          trafficAwareEtaMin: 14,
          trafficDelayMin: 0,
          eta: "14 mins",
          trafficLevel: "NORMAL",
          roadStatus: "OPEN",
          source: "SIMULATED",
          hazardsAvoided: "Direct high-speed arterial corridor active"
        },
        {
          ...DEMO_ROUTES[0],
          type: "Alternative",
          status: "Available"
        },
        {
          ...DEMO_ROUTES[2],
          type: "Alternative",
          status: "Available"
        }
      ],
      highlightedResourceId: "RES-BRO-01"
    }
  }
};
