const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_FILE = path.join(__dirname, 'waste_platform.db');
const db = new DatabaseSync(DB_FILE);

// Initialize Tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      disposal_guide TEXT NOT NULL,
      accepted_items TEXT NOT NULL,
      prohibited_items TEXT NOT NULL,
      co2_factor_per_kg REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS disposal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      is_recyclable INTEGER NOT NULL,
      instructions TEXT NOT NULL,
      safety_warning TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      vehicle_plate TEXT NOT NULL,
      current_zone TEXT NOT NULL,
      active_status TEXT NOT NULL DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      apartment TEXT,
      city TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      category_id TEXT NOT NULL,
      item_description TEXT NOT NULL,
      estimated_weight_kg REAL NOT NULL DEFAULT 5.0,
      bag_count INTEGER NOT NULL DEFAULT 1,
      pickup_date TEXT NOT NULL,
      pickup_time_slot TEXT NOT NULL,
      special_instructions TEXT,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_driver_id INTEGER,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests(id)
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial categories, disposal items, drivers, and requests...');

  // 1. Seed Categories
  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, icon, color, tagline, description, disposal_guide, accepted_items, prohibited_items, co2_factor_per_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    {
      id: 'organic',
      name: 'Organic & Food Waste',
      icon: '🌱',
      color: 'emerald',
      tagline: 'Compostable food scraps, garden trimmings & plant materials',
      description: 'Biodegradable materials that can be converted into rich organic compost rather than generating methane in landfills.',
      disposal_guide: 'Drain excess liquids. Store in compostable paper or certified biodegradable bags. Do not mix with plastic wraps or metal ties.',
      accepted_items: JSON.stringify(['Fruit & vegetable peels', 'Coffee grounds & paper filters', 'Eggshells', 'Leaves & garden waste', 'Stale bread & grains']),
      prohibited_items: JSON.stringify(['Plastic packaging', 'Pet feces or litter', 'Treated or painted wood', 'Cooking grease or large oil quantities']),
      co2_factor_per_kg: 0.85
    },
    {
      id: 'plastic',
      name: 'Recyclable Plastics',
      icon: '♻️',
      color: 'blue',
      tagline: 'PET bottles, HDPE containers, clean rigid polymers (Types 1, 2, 5)',
      description: 'High-value post-consumer polymers destined for mechanical sorting, shredding, and transformation into new packaging and textiles.',
      disposal_guide: 'Empty all liquids and rinse thoroughly. Flatten bottles to save volume. Caps can remain screwed on if clean.',
      accepted_items: JSON.stringify(['PET beverage bottles (#1)', 'Milk jugs & detergent containers (#2)', 'PP food containers (#5)', 'Plastic bottle caps']),
      prohibited_items: JSON.stringify(['Dirty takeout boxes with food', 'Styrofoam / Polystyrene (#6)', 'Plastic grocery bags (drop at retail stores)', 'PVC pipes (#3)']),
      co2_factor_per_kg: 1.45
    },
    {
      id: 'paper',
      name: 'Paper & Cardboard',
      icon: '📦',
      color: 'amber',
      tagline: 'Clean cardboard boxes, newspapers, journals & kraft paper',
      description: 'Dry cellulose fibers suitable for repulping. Conserves trees, water, and industrial processing energy.',
      disposal_guide: 'Break down and flatten all cardboard boxes. Keep materials dry; soggy or oil-stained fibers cannot be repulped.',
      accepted_items: JSON.stringify(['Corrugated delivery boxes', 'Office paper & envelopes', 'Newspapers & magazines', 'Clean cereal boxes']),
      prohibited_items: JSON.stringify(['Greasy pizza boxes (compost or trash)', 'Wax-coated cups', 'Tissue paper & paper towels', 'Laminated foil paper']),
      co2_factor_per_kg: 1.20
    },
    {
      id: 'glass',
      name: 'Glass & Bottles',
      icon: '🍾',
      color: 'teal',
      tagline: 'Flint, amber, and green glass containers & culinary jars',
      description: '100% infinitely recyclable material without degradation in purity or quality. Melted into new bottles at lower furnace temperatures.',
      disposal_guide: 'Rinse jars to remove food residue. Separate metal lids. Never place broken window panes or ceramics in glass collection.',
      accepted_items: JSON.stringify(['Beverage bottles (clear, green, brown)', 'Jam & condiment jars', 'Perfume & cosmetic glass bottles']),
      prohibited_items: JSON.stringify(['Window glass & mirrors', 'Light bulbs (E-waste/Hazardous)', 'Ceramics, porcelain & Pyrex cookware', 'Drinking glasses']),
      co2_factor_per_kg: 0.65
    },
    {
      id: 'metal',
      name: 'Metal & Aluminum',
      icon: '🥫',
      color: 'slate',
      tagline: 'Aluminum beverage cans, tin food cans & clean scrap iron',
      description: 'Recycling aluminum saves 95% of the energy needed to smelt virgin bauxite ore.',
      disposal_guide: 'Quickly rinse out residue. Crushing aluminum cans is welcome. Labels can remain on tin cans.',
      accepted_items: JSON.stringify(['Aluminum soda & seltzer cans', 'Steel & tin food cans', 'Clean aluminum foil & trays', 'Metal lids & caps']),
      prohibited_items: JSON.stringify(['Pressurized aerosol cans with residue', 'Car batteries', 'Electronics with metal casing', 'Needles or medical sharps']),
      co2_factor_per_kg: 2.10
    },
    {
      id: 'ewaste',
      name: 'E-Waste & Electronics',
      icon: '💻',
      color: 'purple',
      tagline: 'Computers, smartphones, small appliances, cables & circuit boards',
      description: 'Contains rare precious metals (gold, silver, copper) and hazardous heavy metals that must not reach municipal landfills.',
      disposal_guide: 'Wipe personal data if possible. Bundle associated power cables. Keep lithium batteries taped at the terminals to prevent shorts.',
      accepted_items: JSON.stringify(['Laptops, desktops & tablets', 'Smartphones & chargers', 'Keyboards, mice & printers', 'Microwaves & toasters', 'Cables & adapters']),
      prohibited_items: JSON.stringify(['Leaking lead-acid car batteries', 'Industrial machinery', 'Smoke detectors containing radioactive isotopes']),
      co2_factor_per_kg: 3.50
    },
    {
      id: 'hazardous',
      name: 'Hazardous & Chemical',
      icon: '☣️',
      color: 'rose',
      tagline: 'Paints, solvents, cleaning chemicals, batteries & fluorescent lamps',
      description: 'Materials posing chemical, toxic, or fire hazards requiring certified specialized neutralisation and safe treatment.',
      disposal_guide: 'Keep in original sealed containers with labels visible. Never mix different chemicals together. Handle with gloves.',
      accepted_items: JSON.stringify(['Latex & oil-based paints', 'Household pesticides & fertilizers', 'Lithium & alkaline batteries', 'Fluorescent tube lights', 'Motor oil & antifreeze']),
      prohibited_items: JSON.stringify(['Ammunition & explosives', 'Bio-hazardous infectious medical waste', 'Radioactive substances']),
      co2_factor_per_kg: 2.80
    },
    {
      id: 'bulky',
      name: 'Bulky Waste & Furniture',
      icon: '🛋️',
      color: 'orange',
      tagline: 'Mattresses, sofas, desks, large appliances & renovation scrap',
      description: 'Large oversized items that cannot fit in standard bins. Sorted for refurbishment, donation, or component recycling.',
      disposal_guide: 'Ensure clear curbside access for heavy vehicle loading. Disassemble large modular furniture if feasible.',
      accepted_items: JSON.stringify(['Mattresses & bed frames', 'Sofas & armchairs', 'Wooden dining tables & chairs', 'Washing machines & refrigerators', 'Carpets']),
      prohibited_items: JSON.stringify(['Hazardous industrial demolition rubble', 'Explosive gas cylinders', 'Vehicle chassis']),
      co2_factor_per_kg: 1.10
    }
  ];

  for (const cat of categories) {
    insertCat.run(
      cat.id,
      cat.name,
      cat.icon,
      cat.color,
      cat.tagline,
      cat.description,
      cat.disposal_guide,
      cat.accepted_items,
      cat.prohibited_items,
      cat.co2_factor_per_kg
    );
  }

  // 2. Seed Quick Search Disposal Items
  const insertItem = db.prepare(`
    INSERT INTO disposal_items (name, category_id, is_recyclable, instructions, safety_warning)
    VALUES (?, ?, ?, ?, ?)
  `);

  const quickItems = [
    { name: 'Pizza Box', category_id: 'paper', is_recyclable: 1, instructions: 'If bottom has grease or cheese, tear off clean top lid for paper recycling; compost or trash the greasy half.', safety_warning: 'Grease ruins paper recycling pulping.' },
    { name: 'Plastic Water Bottle', category_id: 'plastic', is_recyclable: 1, instructions: 'Empty, rinse, and crush. Keep cap screwed on.', safety_warning: null },
    { name: 'Lithium Phone Battery', category_id: 'hazardous', is_recyclable: 1, instructions: 'Do not throw in general trash! Tape terminals with clear tape and request specialized pickup.', safety_warning: 'Risk of fire if punctured or crushed in normal compactor.' },
    { name: 'Laptop / Tablet', category_id: 'ewaste', is_recyclable: 1, instructions: 'Perform a factory reset to erase personal data. Include the charging cord.', safety_warning: 'Contains lithium battery.' },
    { name: 'Aluminum Soda Can', category_id: 'metal', is_recyclable: 1, instructions: 'Rinse out soda residue. Can be crushed to conserve storage volume.', safety_warning: null },
    { name: 'Banana Peels & Coffee Grounds', category_id: 'organic', is_recyclable: 1, instructions: 'Place in compost caddy or compostable paper bag.', safety_warning: null },
    { name: 'Fluorescent Light Tube', category_id: 'hazardous', is_recyclable: 1, instructions: 'Handle with care to prevent breakage. Keep in protective sleeve or box.', safety_warning: 'Contains toxic mercury vapor.' },
    { name: 'Old Mattress', category_id: 'bulky', is_recyclable: 1, instructions: 'Keep dry and place in an accessible curbside location for the heavy pickup crew.', safety_warning: 'Heavy lift - 2 man crew required.' },
    { name: 'Paint Can (Leftover Latex)', category_id: 'hazardous', is_recyclable: 1, instructions: 'Ensure lid is tightly sealed. Do not pour down household drains or gutters.', safety_warning: 'Flammable and environmental contaminant.' },
    { name: 'Wine / Beer Glass Bottle', category_id: 'glass', is_recyclable: 1, instructions: 'Rinse clean. Remove cork or metal cap (metal cap goes to metal recycling).', safety_warning: 'Broken glass must be wrapped in newspaper.' },
    { name: 'Styrofoam Packing Peanuts', category_id: 'plastic', is_recyclable: 0, instructions: 'Expanded polystyrene is generally not accepted in curbside recycling. Reuse for packaging or check specialized drop-off.', safety_warning: 'Breakable into microplastics.' },
    { name: 'Old Microwave Oven', category_id: 'ewaste', is_recyclable: 1, instructions: 'Clean out food residue. Coil power cable around body.', safety_warning: 'High-voltage capacitor inside; do not disassemble.' }
  ];

  for (const item of quickItems) {
    insertItem.run(item.name, item.category_id, item.is_recyclable, item.instructions, item.safety_warning);
  }

  // 3. Seed Drivers / Fleet
  const insertDriver = db.prepare(`
    INSERT INTO drivers (name, phone, vehicle_type, vehicle_plate, current_zone, active_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const drivers = [
    { name: 'Marcus Vance', phone: '+1 (555) 234-5678', vehicle_type: 'Electric Eco-Van (2.5t)', vehicle_plate: 'GRN-4091', current_zone: 'Downtown / Metro Core', active_status: 'available' },
    { name: 'Elena Rostova', phone: '+1 (555) 876-5432', vehicle_type: 'Heavy Compactor Truck #3', vehicle_plate: 'ECO-8822', current_zone: 'North Suburbs & Green Hills', active_status: 'on_route' },
    { name: 'Devon Cole', phone: '+1 (555) 345-9876', vehicle_type: 'HazMat & E-Waste Cargo Unit', vehicle_plate: 'SAF-1049', current_zone: 'Tech Corridor & West Park', active_status: 'available' },
    { name: 'Aisha Patel', phone: '+1 (555) 654-3210', vehicle_type: 'Bulky Hauler Flatbed', vehicle_plate: 'TRK-7714', current_zone: 'South Industrial District', active_status: 'available' }
  ];

  for (const drv of drivers) {
    insertDriver.run(drv.name, drv.phone, drv.vehicle_type, drv.vehicle_plate, drv.current_zone, drv.active_status);
  }

  // 4. Seed Requests across diverse statuses
  const insertReq = db.prepare(`
    INSERT INTO requests (
      tracking_id, user_name, user_email, user_phone, address, apartment, city, zip_code,
      latitude, longitude, category_id, item_description, estimated_weight_kg, bag_count,
      pickup_date, pickup_time_slot, special_instructions, photo_url, status, assigned_driver_id,
      admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHist = db.prepare(`
    INSERT INTO status_history (request_id, status, note, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const today = new Date();
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const sampleRequests = [
    {
      tracking_id: 'ECO-8941',
      user_name: 'Sophia Martinez',
      user_email: 'sophia.m@example.com',
      user_phone: '+1 (555) 312-8899',
      address: '742 Evergreen Terrace',
      apartment: 'Apt 4B',
      city: 'Springfield',
      zip_code: '97477',
      latitude: 44.0532,
      longitude: -123.0189,
      category_id: 'ewaste',
      item_description: '2 broken Lenovo ThinkPad laptops, 1 Epson inkjet printer, 3 charging bricks, box of cables',
      estimated_weight_kg: 14.5,
      bag_count: 2,
      pickup_date: formatDate(1),
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Ring Apt 4B intercom or leave with front desk concierge if morning.',
      photo_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80',
      status: 'scheduled',
      assigned_driver_id: 3,
      admin_notes: 'Priority e-waste verified. Handled by Devon Cole.',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      history: [
        { status: 'pending', note: 'Request submitted online by citizen.', offsetHours: 24 },
        { status: 'scheduled', note: 'Approved by dispatch. Driver Devon Cole assigned.', offsetHours: 18 }
      ]
    },
    {
      tracking_id: 'ECO-8942',
      user_name: 'Liam Chen',
      user_email: 'liam.chen@techstartup.io',
      user_phone: '+1 (555) 789-2211',
      address: '100 Silicon Way, Suite 300',
      apartment: 'Floor 3',
      city: 'Springfield',
      zip_code: '97478',
      latitude: 44.0610,
      longitude: -123.0040,
      category_id: 'paper',
      item_description: '15 flattened double-wall heavy cardboard shipment cartons, clean paper packing shreds',
      estimated_weight_kg: 28.0,
      bag_count: 5,
      pickup_date: formatDate(0),
      pickup_time_slot: 'Afternoon (12:00 PM - 04:00 PM)',
      special_instructions: 'Loading dock on 2nd alleyway behind building. Security code #4910.',
      photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      status: 'in_progress',
      assigned_driver_id: 1,
      admin_notes: 'Driver Marcus Vance currently en route from downtown depot.',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      history: [
        { status: 'pending', note: 'Request submitted online.', offsetHours: 8 },
        { status: 'scheduled', note: 'Scheduled for afternoon pickup.', offsetHours: 5 },
        { status: 'in_progress', note: 'Driver Marcus Vance dispatched and on route.', offsetHours: 1 }
      ]
    },
    {
      tracking_id: 'ECO-8943',
      user_name: 'Amara Okafor',
      user_email: 'amara.o@gardencenter.org',
      user_phone: '+1 (555) 456-7890',
      address: '215 Oak Valley Rd',
      apartment: '',
      city: 'Springfield',
      zip_code: '97477',
      latitude: 44.0480,
      longitude: -123.0310,
      category_id: 'organic',
      item_description: '4 large paper leaf sacks of tree trimmings, dried perennial clippings, compostable kitchen peelings',
      estimated_weight_kg: 32.0,
      bag_count: 4,
      pickup_date: formatDate(-1),
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Placed next to curbside green mailbox.',
      photo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
      status: 'completed',
      assigned_driver_id: 2,
      admin_notes: 'Delivered to Springfield Municipal Composting Facility. 32kg organic mass diverted.',
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      history: [
        { status: 'pending', note: 'Request submitted.', offsetHours: 36 },
        { status: 'scheduled', note: 'Scheduled with Elena Rostova.', offsetHours: 30 },
        { status: 'in_progress', note: 'Pickup in progress.', offsetHours: 16 },
        { status: 'completed', note: 'Successfully collected and delivered to composting hub.', offsetHours: 12 }
      ]
    },
    {
      tracking_id: 'ECO-8944',
      user_name: 'David Miller',
      user_email: 'dmiller99@gmail.com',
      user_phone: '+1 (555) 991-3421',
      address: '45 Lakeview Blvd',
      apartment: '',
      city: 'Springfield',
      zip_code: '97475',
      latitude: 44.0720,
      longitude: -123.0450,
      category_id: 'bulky',
      item_description: 'King size memory foam mattress and disassembled wooden bed slatted frame',
      estimated_weight_kg: 48.0,
      bag_count: 2,
      pickup_date: formatDate(2),
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Driveway has easy turnaround. Items wrapped in protective plastic sheet against rain.',
      photo_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
      status: 'pending',
      assigned_driver_id: null,
      admin_notes: 'Awaiting bulky hauler dispatch confirmation.',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      history: [
        { status: 'pending', note: 'Request submitted online. In dispatcher review queue.', offsetHours: 3 }
      ]
    },
    {
      tracking_id: 'ECO-8945',
      user_name: 'Jessica Taylor',
      user_email: 'jtaylor@artstudio.com',
      user_phone: '+1 (555) 678-1234',
      address: '88 Creative Arts Way',
      apartment: 'Studio 12',
      city: 'Springfield',
      zip_code: '97477',
      latitude: 44.0560,
      longitude: -123.0110,
      category_id: 'hazardous',
      item_description: '3 half-full gallon tins of acrylic and enamel paint, 2 containers of mineral spirits solvent',
      estimated_weight_kg: 8.5,
      bag_count: 1,
      pickup_date: formatDate(1),
      pickup_time_slot: 'Evening (04:00 PM - 08:00 PM)',
      special_instructions: 'Sealed tight in leakproof plastic bin on covered front porch.',
      photo_url: '',
      status: 'scheduled',
      assigned_driver_id: 3,
      admin_notes: 'Chemical disposal safety protocols confirmed.',
      created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      history: [
        { status: 'pending', note: 'Citizen submitted hazardous pickup request.', offsetHours: 14 },
        { status: 'scheduled', note: 'Driver Devon Cole (HazMat unit) scheduled.', offsetHours: 6 }
      ]
    },
    {
      tracking_id: 'ECO-8946',
      user_name: 'Robert King',
      user_email: 'rking@brewerytaps.com',
      user_phone: '+1 (555) 888-9922',
      address: '520 Riverfront Promenade',
      apartment: 'Dock C',
      city: 'Springfield',
      zip_code: '97477',
      latitude: 44.0515,
      longitude: -123.0250,
      category_id: 'glass',
      item_description: '8 crates of sorted amber and green glass bottles, thoroughly washed and caps removed',
      estimated_weight_kg: 65.0,
      bag_count: 8,
      pickup_date: formatDate(-2),
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Commercial rear service bay. Lift gate required.',
      photo_url: '',
      status: 'completed',
      assigned_driver_id: 1,
      admin_notes: 'Transferred to Pacific Glass Recyclers. Receipt #PGR-901.',
      created_at: new Date(Date.now() - 3600000 * 60).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      history: [
        { status: 'pending', note: 'Submitted.', offsetHours: 60 },
        { status: 'scheduled', note: 'Scheduled.', offsetHours: 55 },
        { status: 'in_progress', note: 'Picked up by Marcus Vance.', offsetHours: 50 },
        { status: 'completed', note: 'Completed. 65 kg glass diverted to reuse.', offsetHours: 48 }
      ]
    },
    {
      tracking_id: 'ECO-8947',
      user_name: 'Carlos Gomez',
      user_email: 'carlos.g@gmail.com',
      user_phone: '+1 (555) 777-6543',
      address: '310 Pinecrest Ave',
      apartment: '',
      city: 'Springfield',
      zip_code: '97477',
      latitude: 44.0410,
      longitude: -123.0150,
      category_id: 'plastic',
      item_description: '3 large clear bags of rinsed PET bottles (#1) and milk jugs (#2)',
      estimated_weight_kg: 9.0,
      bag_count: 3,
      pickup_date: formatDate(0),
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Left near side garage door.',
      photo_url: '',
      status: 'cancelled',
      assigned_driver_id: null,
      admin_notes: 'Cancelled upon citizen request: resident dropped off at neighborhood community center.',
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 15).toISOString(),
      history: [
        { status: 'pending', note: 'Submitted online.', offsetHours: 20 },
        { status: 'cancelled', note: 'Cancelled by requester: dropped at community center.', offsetHours: 15 }
      ]
    }
  ];

  for (const req of sampleRequests) {
    const result = insertReq.run(
      req.tracking_id,
      req.user_name,
      req.user_email,
      req.user_phone,
      req.address,
      req.apartment,
      req.city,
      req.zip_code,
      req.latitude,
      req.longitude,
      req.category_id,
      req.item_description,
      req.estimated_weight_kg,
      req.bag_count,
      req.pickup_date,
      req.pickup_time_slot,
      req.special_instructions,
      req.photo_url,
      req.status,
      req.assigned_driver_id,
      req.admin_notes,
      req.created_at,
      req.updated_at
    );

    const requestId = result.lastInsertRowid;
    for (const h of req.history) {
      const histDate = new Date(Date.now() - 3600000 * h.offsetHours).toISOString();
      insertHist.run(Number(requestId), h.status, h.note, histDate);
    }
  }

  console.log('Database initialized and seeded successfully.');
}

// Helper query functions
function getCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return rows.map(r => ({
    ...r,
    accepted_items: JSON.parse(r.accepted_items),
    prohibited_items: JSON.parse(r.prohibited_items)
  }));
}

function searchDisposalGuide(query) {
  if (!query || query.trim() === '') {
    const items = db.prepare(`
      SELECT d.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM disposal_items d
      JOIN categories c ON d.category_id = c.id
      ORDER BY d.name ASC
      LIMIT 12
    `).all();
    return items;
  }

  const clean = `%${query.trim()}%`;
  const items = db.prepare(`
    SELECT d.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM disposal_items d
    JOIN categories c ON d.category_id = c.id
    WHERE d.name LIKE ? OR d.instructions LIKE ? OR c.name LIKE ?
    ORDER BY d.name ASC
  `).all(clean, clean, clean);
  return items;
}

function getDrivers() {
  return db.prepare('SELECT * FROM drivers ORDER BY name ASC').all();
}

function getAllRequests(filters = {}) {
  let query = `
    SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.co2_factor_per_kg,
           d.name as driver_name, d.phone as driver_phone, d.vehicle_type as driver_vehicle, d.vehicle_plate as driver_plate
    FROM requests r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN drivers d ON r.assigned_driver_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status && filters.status !== 'all') {
    query += ' AND r.status = ?';
    params.push(filters.status);
  }

  if (filters.category && filters.category !== 'all') {
    query += ' AND r.category_id = ?';
    params.push(filters.category);
  }

  if (filters.search && filters.search.trim() !== '') {
    const s = `%${filters.search.trim()}%`;
    query += ' AND (r.tracking_id LIKE ? OR r.user_name LIKE ? OR r.address LIKE ? OR r.item_description LIKE ? OR r.user_email LIKE ?)';
    params.push(s, s, s, s, s);
  }

  if (filters.dateFrom) {
    query += ' AND r.pickup_date >= ?';
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    query += ' AND r.pickup_date <= ?';
    params.push(filters.dateTo);
  }

  query += ' ORDER BY r.created_at DESC';

  return db.prepare(query).all(...params);
}

function getRequestByTrackingId(trackingId) {
  const row = db.prepare(`
    SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color, c.co2_factor_per_kg,
           d.name as driver_name, d.phone as driver_phone, d.vehicle_type as driver_vehicle, d.vehicle_plate as driver_plate
    FROM requests r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN drivers d ON r.assigned_driver_id = d.id
    WHERE r.tracking_id = ? OR r.id = ?
  `).get(trackingId, trackingId);

  if (!row) return null;

  const history = db.prepare(`
    SELECT * FROM status_history
    WHERE request_id = ?
    ORDER BY created_at ASC
  `).all(row.id);

  return { ...row, history };
}

function createRequest(data) {
  // Generate friendly tracking ID: ECO-YYYY-RANDOM
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const trackingId = `ECO-${randomSuffix}`;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO requests (
      tracking_id, user_name, user_email, user_phone, address, apartment, city, zip_code,
      latitude, longitude, category_id, item_description, estimated_weight_kg, bag_count,
      pickup_date, pickup_time_slot, special_instructions, photo_url, status, assigned_driver_id,
      admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, '', ?, ?)
  `);

  const result = insert.run(
    trackingId,
    data.user_name || 'Anonymous Citizen',
    data.user_email || '',
    data.user_phone || '',
    data.address || '',
    data.apartment || '',
    data.city || 'Springfield',
    data.zip_code || '97477',
    data.latitude ? Number(data.latitude) : 44.0521,
    data.longitude ? Number(data.longitude) : -123.0165,
    data.category_id,
    data.item_description || 'General waste collection items',
    data.estimated_weight_kg ? Number(data.estimated_weight_kg) : 5.0,
    data.bag_count ? Number(data.bag_count) : 1,
    data.pickup_date,
    data.pickup_time_slot,
    data.special_instructions || '',
    data.photo_url || '',
    now,
    now
  );

  const newId = Number(result.lastInsertRowid);

  // Record initial history
  db.prepare(`
    INSERT INTO status_history (request_id, status, note, created_at)
    VALUES (?, 'pending', 'Pickup request received and queued for dispatch review.', ?)
  `).run(newId, now);

  return getRequestByTrackingId(trackingId);
}

function updateRequestStatus(id, { status, assigned_driver_id, admin_notes, history_note }) {
  const req = db.prepare('SELECT * FROM requests WHERE id = ? OR tracking_id = ?').get(id, id);
  if (!req) return null;

  const now = new Date().toISOString();
  const newStatus = status || req.status;
  const newDriver = assigned_driver_id !== undefined ? (assigned_driver_id ? Number(assigned_driver_id) : null) : req.assigned_driver_id;
  const newNotes = admin_notes !== undefined ? admin_notes : req.admin_notes;

  db.prepare(`
    UPDATE requests
    SET status = ?, assigned_driver_id = ?, admin_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, newDriver, newNotes, now, req.id);

  const noteText = history_note || `Status updated to ${newStatus}${newDriver ? ' (Driver assigned)' : ''}`;
  db.prepare(`
    INSERT INTO status_history (request_id, status, note, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.id, newStatus, noteText, now);

  return getRequestByTrackingId(req.tracking_id);
}

function getPlatformStatistics() {
  const totalRequests = db.prepare('SELECT COUNT(*) as count FROM requests').get().count;
  
  const statusCountsRows = db.prepare(`
    SELECT status, COUNT(*) as count FROM requests GROUP BY status
  `).all();
  const statusCounts = { pending: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
  statusCountsRows.forEach(r => { statusCounts[r.status] = r.count; });

  const totalDivertedKg = db.prepare(`
    SELECT COALESCE(SUM(estimated_weight_kg), 0) as total
    FROM requests
    WHERE status IN ('completed', 'in_progress', 'scheduled')
  `).get().total;

  const completedKg = db.prepare(`
    SELECT COALESCE(SUM(estimated_weight_kg), 0) as total
    FROM requests
    WHERE status = 'completed'
  `).get().total;

  // Category breakdown
  const categoryStats = db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, c.co2_factor_per_kg,
           COUNT(r.id) as request_count,
           COALESCE(SUM(r.estimated_weight_kg), 0) as total_weight_kg
    FROM categories c
    LEFT JOIN requests r ON c.id = r.category_id AND r.status != 'cancelled'
    GROUP BY c.id
    ORDER BY total_weight_kg DESC
  `).all();

  // Calculate estimated total CO2 avoided in kg
  let totalCo2SavedKg = 0;
  categoryStats.forEach(c => {
    totalCo2SavedKg += c.total_weight_kg * c.co2_factor_per_kg;
  });

  // Calculate tree equivalents (1 mature tree absorbs ~22kg CO2 per year)
  const treesPlantedEquivalent = Math.round(totalCo2SavedKg / 22);

  // Active drivers count
  const activeDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE active_status != 'off_duty'").get().count;

  return {
    totalRequests,
    statusCounts,
    totalDivertedKg: Math.round(totalDivertedKg * 10) / 10,
    completedKg: Math.round(completedKg * 10) / 10,
    totalCo2SavedKg: Math.round(totalCo2SavedKg * 10) / 10,
    treesPlantedEquivalent,
    activeDrivers,
    categoryStats
  };
}

module.exports = {
  initDatabase,
  getCategories,
  searchDisposalGuide,
  getDrivers,
  getAllRequests,
  getRequestByTrackingId,
  createRequest,
  updateRequestStatus,
  getPlatformStatistics
};
