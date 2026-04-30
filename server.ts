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

// Initialize in-memory SQLite database
const db = new Database(":memory:");

// Enhanced Schema with Assignments
db.exec(`
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
    provider_id TEXT, -- User ID of the actual provider
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
`);

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

  // Insert seed data
  const regionAId = uuidv4();
  const regionBId = uuidv4();
  const classId = uuidv4();
  const methodId = uuidv4();
  const roleAdminId = uuidv4();
  const roleManagerId = uuidv4();
  const roleUserId = uuidv4();
  const roleProviderId = uuidv4();

  const adminHashed = bcrypt.hashSync("admin", 10);
  const userHashed = bcrypt.hashSync("user", 10);
  const providerHashed = bcrypt.hashSync("provider", 10);

  const adminId = uuidv4();
  const userId = uuidv4();
  const userProviderId = "provider-stable-id-123";

  db.exec(`
    INSERT INTO roles (id, name, description) VALUES
      ('${roleAdminId}', 'admin', 'System Administrator'),
      ('${roleManagerId}', 'manager', 'Operations Manager'),
      ('${roleUserId}', 'user', 'Standard User'),
      ('${roleProviderId}', 'provider', 'Shipping Provider');

    INSERT INTO role_permissions (id, role_id, permission, conditions) VALUES
      ('${uuidv4()}', '${roleAdminId}', '*:*', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:read', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:write', '{"cost": {"$lt": 1000}}'),
      ('${uuidv4()}', '${roleUserId}', 'orders:read', '{"user_id": "$user_id"}'),
      ('${uuidv4()}', '${roleProviderId}', 'orders:read', '{"provider_id": "$user_id"}');

    INSERT INTO users (id, name, email, password, status) VALUES
      ('${adminId}', 'Admin User', 'admin@admin.com', '${adminHashed}', 'active'),
      ('${userId}', 'Regular User', 'user@admin.com', '${userHashed}', 'active'),
      ('${userProviderId}', 'Fast Delivery Co', 'provider@admin.com', '${providerHashed}', 'active');

    INSERT INTO user_roles (id, user_id, role_id) VALUES
      ('${uuidv4()}', '${adminId}', '${roleAdminId}'),
      ('${uuidv4()}', '${userId}', '${roleUserId}'),
      ('${uuidv4()}', '${userProviderId}', '${roleProviderId}');

    INSERT INTO shipping_regions (id, name, country_code, metas) VALUES 
      ('${regionAId}', 'Muscat', 'OM', '{"ar:title": "مسقط"}'),
      ('${regionBId}', 'Dubai', 'AE', '{"ar:title": "دبي"}');

    INSERT INTO shipping_methods (id, name, type, base_cost, status) VALUES 
      ('${methodId}', 'Express Air', 'air', 50.0, 'active');

    INSERT INTO shipping_matrix (id, from_region_id, to_region_id, method_id, cost_multiplier, estimated_days) VALUES
      ('${uuidv4()}', '${regionAId}', '${regionBId}', '${methodId}', 1.2, 2);

    INSERT INTO shipping_classes (id, name, description, weight_limit, size_limit) VALUES
      ('${classId}', 'Standard Box', 'Up to 5kg', 5.0, 0.5);
  `);

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

     let orders;
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

  app.post("/api/orders", authorize("orders:write"), (req: any, res) => {
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
        SELECT u.id, u.name, u.email, u.status, r.name as role 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ?
      `).get(decoded.id);
      
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Admin API Routes
  app.get("/api/admin/analytics", authorize("*:*"), (req, res) => {
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

  app.get("/api/admin/users", authorize("*:*"), (req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.status, r.name as role 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
    `).all();
    res.json(users);
  });

  app.get("/api/admin/methods", authorize("*:*"), (req, res) => {
    const methods = db.prepare("SELECT * FROM shipping_methods").all();
    res.json(methods);
  });

  app.get("/api/admin/regions", authorize("*:*"), (req, res) => {
    const regions = db.prepare("SELECT * FROM shipping_regions").all();
    res.json(regions.map((r: any) => ({ ...r, metas: JSON.parse(r.metas || '{}') })));
  });

  app.get("/api/admin/matrix", authorize("*:*"), (req, res) => {
    const matrix = db.prepare(`
      SELECT m.*, r1.name as from_region_name, r2.name as to_region_name, sm.name as method_name
      FROM shipping_matrix m
      JOIN shipping_regions r1 ON m.from_region_id = r1.id
      JOIN shipping_regions r2 ON m.to_region_id = r2.id
      JOIN shipping_methods sm ON m.method_id = sm.id
    `).all();
    res.json(matrix);
  });

  app.get("/api/admin/providers", authorize("*:*"), (req, res) => {
    const providers = db.prepare("SELECT * FROM shipping_providers").all();
    res.json(providers);
  });

  app.get("/api/admin/roles", authorize("*:*"), (req, res) => {
    const roles = db.prepare("SELECT * FROM roles").all();
    res.json(roles);
  });

  app.get("/api/admin/channels", authorize("*:*"), (req, res) => {
    const channels = db.prepare("SELECT * FROM channels").all();
    res.json(channels);
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
      'subscriptions': 'channel_subscriptions'
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
      'subscriptions': 'channel_subscriptions'
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
      'channels': 'channels'
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
