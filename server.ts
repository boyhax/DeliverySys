import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const JWT_SECRET = process.env.JWT_SECRET || "ship-control-secret-key-2026";
const IS_DEV = process.env.NODE_ENV !== "production";

// Initialize database (file-based for dev persistence, though we reset it)
const db = new Database(IS_DEV ? "dev.db" : ":memory:");

function initSchema() {
  db.exec(`
    DROP TABLE IF EXISTS channel_subscriptions;
    DROP TABLE IF EXISTS channels;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS provider_assignments;
    DROP TABLE IF EXISTS shipping_providers;
    DROP TABLE IF EXISTS shipping_classes;
    DROP TABLE IF EXISTS shipping_automations;
    DROP TABLE IF EXISTS shipping_matrix;
    DROP TABLE IF EXISTS shipping_regions;
    DROP TABLE IF EXISTS shipping_methods;
    DROP TABLE IF EXISTS user_roles;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS role_permissions;
    DROP TABLE IF EXISTS roles;

    CREATE TABLE roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      description TEXT
    );

    CREATE TABLE role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT,
      permission TEXT,
      conditions TEXT,
      FOREIGN KEY(role_id) REFERENCES roles(id)
    );

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      status TEXT
    );

    CREATE TABLE user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      role_id TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(role_id) REFERENCES roles(id)
    );

    CREATE TABLE shipping_methods (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT, -- 'air', 'sea', 'land'
      base_cost REAL,
      status TEXT
    );

    CREATE TABLE shipping_regions (
      id TEXT PRIMARY KEY,
      name TEXT,
      country_code TEXT,
      metas TEXT -- JSON string for translations, etc.
    );

    CREATE TABLE shipping_matrix (
      id TEXT PRIMARY KEY,
      from_region_id TEXT,
      to_region_id TEXT,
      method_id TEXT,
      cost_multiplier REAL,
      estimated_days INTEGER,
      FOREIGN KEY(from_region_id) REFERENCES shipping_regions(id),
      FOREIGN KEY(to_region_id) REFERENCES shipping_regions(id),
      FOREIGN KEY(method_id) REFERENCES shipping_methods(id)
    );

    CREATE TABLE shipping_classes (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      weight_limit REAL,
      size_limit REAL
    );

    CREATE TABLE shipping_providers (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT, -- 'freelancer', 'company', 'hired driver'
      phone TEXT,
      email TEXT,
      performance_score REAL,
      status TEXT
    );

    CREATE TABLE provider_assignments (
      id TEXT PRIMARY KEY,
      provider_id TEXT,
      method_id TEXT,
      FOREIGN KEY(provider_id) REFERENCES shipping_providers(id),
      FOREIGN KEY(method_id) REFERENCES shipping_methods(id)
    );

    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      from_region_id TEXT,
      to_region_id TEXT,
      method_id TEXT,
      provider_id TEXT, 
      status TEXT,
      total_cost REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE channels (
      id TEXT PRIMARY KEY,
      name TEXT,
      topic TEXT,
      type TEXT, -- 'sms', 'email', 'fcm', 'chat'
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE channel_subscriptions (
      id TEXT PRIMARY KEY,
      channel_id TEXT,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(channel_id) REFERENCES channels(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE shipping_automations (
      id TEXT PRIMARY KEY,
      matrix_id TEXT,
      assignment_type TEXT, -- 'auto', 'nomination'
      nomination_type TEXT, -- 'bulk', 'one-by-one'
      time_window INTEGER, -- in minutes
      nomination_logic TEXT, -- 'distance', 'shuffle', 'order'
      status TEXT, -- 'active', 'inactive'
      FOREIGN KEY(matrix_id) REFERENCES shipping_matrix(id)
    );
  `);
}

function seedData() {
  const adminId = uuidv4();
  const managerId = uuidv4();
  const customerId = uuidv4();
  const providerId = "provider-stable-id-123";

  const roleAdminId = uuidv4();
  const roleManagerId = uuidv4();
  const roleUserId = uuidv4();
  const roleProviderId = uuidv4();

  const hashedPw = bcrypt.hashSync("password123", 10);

  // 1. Roles & Permissions
  db.exec(`
    INSERT INTO roles (id, name, description) VALUES
      ('${roleAdminId}', 'admin', 'System Administrator'),
      ('${roleManagerId}', 'manager', 'Operations Manager'),
      ('${roleUserId}', 'user', 'Standard Customer'),
      ('${roleProviderId}', 'provider', 'Logistics Provider');

    INSERT INTO role_permissions (id, role_id, permission, conditions) VALUES
      ('${uuidv4()}', '${roleAdminId}', '*:*', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:read', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:write', null),
      ('${uuidv4()}', '${roleManagerId}', 'analytics:read', null),
      ('${uuidv4()}', '${roleUserId}', 'orders:read', '{"user_id": "$user_id"}'),
      ('${uuidv4()}', '${roleUserId}', 'orders:create', null),
      ('${uuidv4()}', '${roleProviderId}', 'orders:read', '{"provider_id": "$user_id"}'),
      ('${uuidv4()}', '${roleProviderId}', 'orders:update_status', null);
  `);

  // 2. Users (Oman Seeds)
  db.exec(`
    INSERT INTO users (id, name, email, password, status) VALUES
      ('${adminId}', 'Oman Admin', 'admin@ship.om', '${hashedPw}', 'active'),
      ('${managerId}', 'Muscat Hub Manager', 'manager@ship.om', '${hashedPw}', 'active'),
      ('${customerId}', 'Salim Al-Said', 'customer@ship.om', '${hashedPw}', 'active'),
      ('${providerId}', 'Musandam Express', 'provider@ship.om', '${hashedPw}', 'active');

    INSERT INTO user_roles (id, user_id, role_id) VALUES
      ('${uuidv4()}', '${adminId}', '${roleAdminId}'),
      ('${uuidv4()}', '${managerId}', '${roleManagerId}'),
      ('${uuidv4()}', '${customerId}', '${roleUserId}'),
      ('${uuidv4()}', '${providerId}', '${roleProviderId}');
  `);

  // 3. Oman Regions (Cities)
  const cities = [
    { name: 'Muscat', ar: 'مسقط' },
    { name: 'Salalah', ar: 'صلالة' },
    { name: 'Sohar', ar: 'صحار' },
    { name: 'Nizwa', ar: 'نزوى' },
    { name: 'Sur', ar: 'صور' },
    { name: 'Ibri', ar: 'عبري' },
    { name: 'Buraimi', ar: 'البريمي' },
    { name: 'Khasab', ar: 'خصب' },
    { name: 'Duqm', ar: 'الدقم' },
    { name: 'Rustaq', ar: 'الرستاق' }
  ];

  const regionIds: Record<string, string> = {};
  cities.forEach(city => {
    const id = uuidv4();
    regionIds[city.name] = id;
    db.prepare(`INSERT INTO shipping_regions (id, name, country_code, metas) VALUES (?, ?, 'OM', ?)`).run(
      id, city.name, JSON.stringify({ "ar": city.ar })
    );
  });

  // 4. Shipping Methods
  const landStandardId = uuidv4();
  const landExpressId = uuidv4();
  const bikeId = uuidv4();
  const heavyId = uuidv4();

  db.exec(`
    INSERT INTO shipping_methods (id, name, type, base_cost, status) VALUES 
      ('${landStandardId}', 'Standard Land', 'land', 2.5, 'active'),
      ('${landExpressId}', 'Express Land', 'land', 5.0, 'active'),
      ('${bikeId}', 'Bike Delivery (Intra-city)', 'land', 1.5, 'active'),
      ('${heavyId}', 'Heavy Cargo', 'land', 15.0, 'active');
  `);

  // 5. Shipping Matrix (Routes)
  const routes = [
    { from: 'Muscat', to: 'Salalah', method: landStandardId, multiplier: 1.5, days: 2 },
    { from: 'Muscat', to: 'Sohar', method: landExpressId, multiplier: 1.1, days: 1 },
    { from: 'Muscat', to: 'Nizwa', method: bikeId, multiplier: 1.0, days: 1 },
    { from: 'Muscat', to: 'Sur', method: landStandardId, multiplier: 1.2, days: 1 },
    { from: 'Sohar', to: 'Buraimi', method: landExpressId, multiplier: 1.0, days: 1 },
    { from: 'Salalah', to: 'Duqm', method: heavyId, multiplier: 2.0, days: 3 }
  ];

  const matrixIds: string[] = [];
  routes.forEach(r => {
    const id = uuidv4();
    matrixIds.push(id);
    db.prepare(`
      INSERT INTO shipping_matrix (id, from_region_id, to_region_id, method_id, cost_multiplier, estimated_days) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, regionIds[r.from], regionIds[r.to], r.method, r.multiplier, r.days);
  });

  // 6. Automation Rules
  db.prepare(`
    INSERT INTO shipping_automations (id, matrix_id, assignment_type, nomination_type, time_window, nomination_logic, status)
    VALUES (?, ?, 'auto', 'bulk', 30, 'distance', 'active')
  `).run(uuidv4(), matrixIds[0]);

  // 7. Providers & Eligibility
  const p1 = uuidv4();
  const p2 = uuidv4();
  db.exec(`
    INSERT INTO shipping_providers (id, name, type, phone, email, performance_score, status) VALUES
      ('${p1}', 'Oman Logistics Group', 'company', '+96812345678', 'ops@omanlog.om', 4.8, 'active'),
      ('${p2}', 'Muscat Fast Biker', 'freelancer', '+96887654321', 'biker@muscat.om', 4.5, 'active');

    INSERT INTO provider_assignments (id, provider_id, method_id) VALUES
      ('${uuidv4()}', '${p1}', '${landStandardId}'),
      ('${uuidv4()}', '${p1}', '${heavyId}'),
      ('${uuidv4()}', '${p2}', '${bikeId}');
  `);

  // 8. Orders
  db.prepare(`
    INSERT INTO orders (id, user_id, from_region_id, to_region_id, method_id, provider_id, status, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, 'in_transit', 12.5)
  `).run(uuidv4(), customerId, regionIds['Muscat'], regionIds['Sohar'], landExpressId, providerId);
}

// Initialize Schema and Seed
initSchema();
if (IS_DEV) {
  console.log("Development mode: Seeding database...");
  seedData();
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Real-time client matching
  const clients = new Map<string, WebSocket>();

  wss.on("connection", (ws, req) => {
    // Basic auth logic
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth" && data.userId) {
          clients.set(data.userId, ws);
        }
      } catch (e) {}
    });

    ws.on("close", () => {
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
    });
  });

  const broadcastAlert = (userId: string, alert: any) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "alert", ...alert }));
    }
  };

  app.use(express.json());

  // Auth/Permission Logic
  const evaluateAttributeRule = (conditions: string | null, data: any) => {
    if (!conditions) return true;
    try {
      const rules = JSON.parse(conditions);
      for (const [key, value] of Object.entries(rules)) {
        if (typeof value === 'object' && value !== null) {
          const val = value as any;
          if (val.$lt && data[key] >= val.$lt) return false;
          if (val.$gt && data[key] <= val.$gt) return false;
        } else {
          if (data[key] !== value) return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const checkPermission = (user: any, requiredPermission: string, resourceData?: any) => {
    const permissions = db.prepare(`
      SELECT rp.permission, rp.conditions
      FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(user.id) as { permission: string; conditions: string }[];
    
    const matches = permissions.filter(p => p.permission === requiredPermission || p.permission === '*:*');
    
    if (matches.length === 0) return false;

    const context = { ...resourceData, user_id: user.id, provider_id: user.id };
    
    return matches.some(p => {
       let conditions = p.conditions;
       if (conditions) {
         conditions = conditions.replace(/\$user_id/g, user.id);
       }
       return evaluateAttributeRule(conditions, context);
    });
  };

  const authorize = (permission: string) => (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      
      if (!user) return res.status(401).json({ error: "User no longer exists" });
      
      req.user = user;

      if (!checkPermission(user, permission, req.body)) {
        console.log(`[Auth] Permission denied for ${user.email} on ${permission}`);
        return res.status(403).json({ error: `Forbidden: Missing ${permission}` });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.get("/api/regions", (req, res) => {
    const regions = db.prepare("SELECT * FROM shipping_regions").all();
    res.json(regions.map((r: any) => ({ ...r, metas: JSON.parse(r.metas || '{}') })));
  });

  app.get("/api/orders", authorize("orders:read"), (req: any, res) => {
     const user: any = db.prepare(`
        SELECT r.name as role 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ?
      `).get(req.user.id);

     let orders: any[] = [];
     if (user.role === 'provider') {
       orders = db.prepare(`
         SELECT o.*, r1.name as from_region_name, r2.name as to_region_name 
         FROM orders o
         JOIN shipping_regions r1 ON o.from_region_id = r1.id
         JOIN shipping_regions r2 ON o.to_region_id = r2.id
         WHERE o.provider_id = ?
       `).all(req.user.id);
     } else if (user.role === 'admin') {
       orders = db.prepare(`
         SELECT o.*, r1.name as from_region_name, r2.name as to_region_name 
         FROM orders o
         JOIN shipping_regions r1 ON o.from_region_id = r1.id
         JOIN shipping_regions r2 ON o.to_region_id = r2.id
       `).all();
     } else {
       orders = db.prepare(`
         SELECT o.*, r1.name as from_region_name, r2.name as to_region_name 
         FROM orders o
         JOIN shipping_regions r1 ON o.from_region_id = r1.id
         JOIN shipping_regions r2 ON o.to_region_id = r2.id
         WHERE o.user_id = ?
       `).all(req.user.id);
     }
     res.json(orders);
  });

  app.post("/api/orders", authorize("orders:create"), (req: any, res) => {
    const { fromRegionId, toRegionId, methodId, totalCost } = req.body;
    const orderId = uuidv4();
    db.prepare(`
      INSERT INTO orders (id, user_id, from_region_id, to_region_id, method_id, status, total_cost)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(orderId, req.user.id, fromRegionId, toRegionId, methodId, totalCost);
    
    res.json({ id: orderId, status: 'pending' });
  });

  app.post("/api/assign-order", authorize("orders:write"), (req: any, res) => {
    const { orderId, providerId } = req.body;
    db.prepare("UPDATE orders SET provider_id = ?, status = 'assigned' WHERE id = ?").run(providerId, orderId);
    
    // In progress: Alert the provider
    const order: any = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    broadcastAlert(providerId, { 
      message: `New assignment: Order ${orderId.slice(0,8)} assigned to you.`,
      order
    });
    
    res.json({ success: true });
  });

  app.post("/api/calculate-shipping", (req, res) => {
    const { fromRegionId, toRegionId, weight, sizeM2 } = req.body;
    
    const routes = db.prepare(`
      SELECT m.*, sm.id as method_id, sm.name as method_name, sm.base_cost
      FROM shipping_matrix m
      JOIN shipping_methods sm ON m.method_id = sm.id
      WHERE m.from_region_id = ? AND m.to_region_id = ?
    `).all(fromRegionId, toRegionId);

    const quotes = routes.map((route: any) => {
      const baseCost = route.base_cost || 50;
      const multiplier = route.cost_multiplier || 1;
      const total = (baseCost + (weight * 2) + (sizeM2 * 10)) * multiplier;
      
      return {
        method: { id: route.method_id, name: route.method_name },
        matrix: { 
          id: route.id, 
          estimated_days: route.estimated_days,
          from_region_id: route.from_region_id,
          to_region_id: route.to_region_id
        },
        total
      };
    });

    res.json(quotes);
  });

  app.patch("/api/orders/:id/status", authorize("orders:update_status"), (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.put("/api/orders/:id/status", authorize("orders:update_status"), (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.get("/api/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user: any = db.prepare(`
        SELECT u.id, u.name, u.email, u.status, r.id as roleId, r.name as role 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ?
      `).get(decoded.id);
      
      if (!user) return res.status(404).json({ error: "User not found" });

      const permissions = db.prepare(`
        SELECT permission, conditions FROM role_permissions
        WHERE role_id = ?
      `).all(user.roleId);

      res.json({ ...user, permissions });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Admin API Routes
  app.get("/api/admin/analytics", authorize("analytics:read"), (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(total_cost) as total FROM orders").get() as any;
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as any;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    
    res.json({
      totalRevenue: totalRevenue?.total || 0,
      orderCount: orderCount?.count || 0,
      activeUsers: activeUsers?.count || 0,
      shippingDistribution: [
        { name: 'Air', value: 400 },
        { name: 'Sea', value: 300 },
        { name: 'Land', value: 300 },
      ]
    });
  });

  app.get("/api/admin/users", authorize("users:read"), (req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.status, r.name as role 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `).all();
    res.json(users);
  });

  app.get("/api/admin/methods", authorize("methods:read"), (req, res) => {
    const methods = db.prepare("SELECT * FROM shipping_methods").all();
    res.json(methods);
  });

  app.get("/api/admin/regions", authorize("regions:read"), (req, res) => {
    const regions = db.prepare("SELECT * FROM shipping_regions").all();
    res.json(regions.map((r: any) => ({ ...r, metas: JSON.parse(r.metas || '{}') })));
  });

  app.get("/api/admin/matrix", authorize("matrix:read"), (req, res) => {
    const matrix = db.prepare(`
      SELECT m.*, r1.name as from_region_name, r2.name as to_region_name, sm.name as method_name
      FROM shipping_matrix m
      JOIN shipping_regions r1 ON m.from_region_id = r1.id
      JOIN shipping_regions r2 ON m.to_region_id = r2.id
      JOIN shipping_methods sm ON m.method_id = sm.id
    `).all();
    res.json(matrix);
  });

  app.get("/api/admin/providers", authorize("providers:read"), (req, res) => {
    const providers = db.prepare("SELECT * FROM shipping_providers").all();
    res.json(providers);
  });

  app.get("/api/admin/roles", authorize("roles:read"), (req, res) => {
    const roles = db.prepare("SELECT * FROM roles").all();
    res.json(roles);
  });

  app.get("/api/admin/channels", authorize("channels:read"), (req, res) => {
    const channels = db.prepare("SELECT * FROM channels").all();
    res.json(channels);
  });

  app.get("/api/admin/automations", authorize("matrix:read"), (req, res) => {
    const automations = db.prepare(`
      SELECT sa.*, r1.name as from_region_name, r2.name as to_region_name, sm.name as method_name
      FROM shipping_automations sa
      JOIN shipping_matrix m ON sa.matrix_id = m.id
      JOIN shipping_regions r1 ON m.from_region_id = r1.id
      JOIN shipping_regions r2 ON m.to_region_id = r2.id
      JOIN shipping_methods sm ON m.method_id = sm.id
    `).all();
    res.json(automations);
  });

  app.get("/api/admin/subscriptions", authorize("*:*"), (req, res) => {
    const subs = db.prepare(`
      SELECT cs.*, c.name as channel_name, u.name as user_name, u.email as user_email
      FROM channel_subscriptions cs
      JOIN channels c ON cs.channel_id = c.id
      JOIN users u ON cs.user_id = u.id
    `).all();
    res.json(subs);
  });

  app.post("/api/admin/subscriptions", authorize("*:*"), (req, res) => {
    const { channel_id, user_id } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO channel_subscriptions (id, channel_id, user_id) VALUES (?, ?, ?)").run(id, channel_id, user_id);
      res.json({ id, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/classes", (req, res) => {
    const classes = db.prepare("SELECT * FROM shipping_classes").all();
    res.json(classes);
  });

  app.post("/api/admin/orders/bulk", authorize("*:*"), (req: any, res) => {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ error: "Invalid payload" });
    
    const stmt = db.prepare(`
      INSERT INTO orders (id, user_id, status, total_cost)
      VALUES (?, ?, ?, ?)
    `);
    
    const transaction = db.transaction((orderList) => {
      for (const order of orderList) {
        stmt.run(uuidv4(), req.user.id, 'pending', order.cost || 50);
      }
    });
    
    transaction(orders);
    res.json({ success: true, count: orders.length });
  });

  app.get("/api/admin/eligibility", authorize("*:*"), (req, res) => {
    const eligibility = db.prepare(`
      SELECT pa.*, sp.name as provider_name, sm.name as method_name
      FROM provider_assignments pa
      JOIN shipping_providers sp ON pa.provider_id = sp.id
      JOIN shipping_methods sm ON pa.method_id = sm.id
    `).all();
    res.json(eligibility);
  });

  // Generic Admin Write Handlers (Simplified)
  app.post("/api/admin/:type", authorize("*:*"), (req, res) => {
    const { type } = req.params;
    // Map frontend types to table names
    const tableMap: any = {
      'methods': 'shipping_methods',
      'regions': 'shipping_regions',
      'matrix': 'shipping_matrix',
      'providers': 'shipping_providers',
      'users': 'users',
      'channels': 'channels',
      'subscriptions': 'channel_subscriptions',
      'automations': 'shipping_automations'
    };
    const table = tableMap[type];
    if (!table) return res.status(404).json({ error: "Unknown type" });

    const id = uuidv4();
    const keys = Object.keys(req.body).filter(k => k !== 'id');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => typeof req.body[k] === 'object' ? JSON.stringify(req.body[k]) : req.body[k]);

    try {
      db.prepare(`INSERT INTO ${table} (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`).run(id, ...values);
      res.json({ id, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/:type/:id", authorize("*:*"), (req, res) => {
    const { type, id } = req.params;
    const tableMap: any = {
      'methods': 'shipping_methods',
      'regions': 'shipping_regions',
      'matrix': 'shipping_matrix',
      'providers': 'shipping_providers',
      'users': 'users',
      'eligibility': 'provider_assignments',
      'channels': 'channels',
      'subscriptions': 'channel_subscriptions',
      'automations': 'shipping_automations'
    };
    const table = tableMap[type];
    if (!table) return res.status(404).json({ error: "Unknown type" });

    try {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/orders", authorize("*:*"), (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, r1.name as from_region_name, r2.name as to_region_name 
      FROM orders o
      JOIN shipping_regions r1 ON o.from_region_id = r1.id
      JOIN shipping_regions r2 ON o.to_region_id = r2.id
    `).all();
    res.json(orders);
  });

  app.put("/api/admin/users/:id", authorize("*:*"), (req: any, res) => {
    const { id } = req.params;
    const { roleId, status, name, email } = req.body;

    try {
      const transaction = db.transaction(() => {
        // Update user basics
        db.prepare("UPDATE users SET status = ?, name = ?, email = ? WHERE id = ?").run(status, name, email, id);
        
        // Update role if provided
        if (roleId) {
          db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(id);
          db.prepare("INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)").run(uuidv4(), id, roleId);
        }
      });
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/:type/:id", authorize("*:*"), (req, res) => {
    const { type, id } = req.params;
    const tableMap: any = {
      'methods': 'shipping_methods',
      'regions': 'shipping_regions',
      'matrix': 'shipping_matrix',
      'providers': 'shipping_providers',
      'users': 'users',
      'orders': 'orders',
      'channels': 'channels',
      'automations': 'shipping_automations'
    };
    const table = tableMap[type];
    if (!table) return res.status(404).json({ error: "Unknown type" });

    const keys = Object.keys(req.body).filter(k => k !== 'id');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => typeof req.body[k] === 'object' ? JSON.stringify(req.body[k]) : req.body[k]);

    try {
      db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message || "An unexpected error occurred",
      path: req.path
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
