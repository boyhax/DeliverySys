import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "ship-control-secret-key-2026";

// Initialize in-memory SQLite database
const db = new Database(":memory:");

// Initialize Schema
db.exec(`
  CREATE TABLE shipping_methods (
    id TEXT PRIMARY KEY,
    name TEXT,
    shipping_class_id TEXT,
    shipping_class TEXT DEFAULT 'standard',
    base_cost DECIMAL,
    cost_per_kg DECIMAL,
    cost_per_m2 DECIMAL,
    is_active INTEGER DEFAULT 1,
    metas TEXT -- JSON string
  );

  CREATE TABLE shipping_classes (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    image_url TEXT
  );

  CREATE TABLE shipping_method_classes (
    id TEXT PRIMARY KEY,
    shipping_method_id TEXT,
    shipping_class_id TEXT
  );

  CREATE TABLE shipping_regions (
    id TEXT PRIMARY KEY,
    name TEXT,
    country_code TEXT,
    image_url TEXT,
    metas TEXT -- JSON string
  );

  CREATE TABLE shipping_method_region_matrix (
    id TEXT PRIMARY KEY,
    from_region_id TEXT,
    to_region_id TEXT,
    shipping_method_id TEXT,
    base_cost_override DECIMAL NULL,
    cost_per_kg_override DECIMAL NULL,
    cost_per_m2_override DECIMAL NULL,
    estimated_days INT,
    transport_type TEXT,
    transport_image_url TEXT,
    route_image_url TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE shipping_strategies (
    id TEXT PRIMARY KEY,
    matrix_id TEXT,
    name TEXT,
    type TEXT,
    priority INT,
    config TEXT, -- JSON string
    icon_url TEXT,
    is_active BOOLEAN
  );

  CREATE TABLE shipping_providers (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    logo_url TEXT,
    status TEXT,
    metas TEXT -- JSON string
  );

  CREATE TABLE strategy_providers (
    id TEXT PRIMARY KEY,
    strategy_id TEXT,
    provider_id TEXT
  );

  CREATE TABLE provider_region_matrix (
    id TEXT PRIMARY KEY,
    provider_id TEXT,
    region_id TEXT,
    is_active BOOLEAN
  );

  CREATE TABLE provider_methods (
    id TEXT PRIMARY KEY,
    provider_id TEXT,
    shipping_method_id TEXT
  );

  CREATE TABLE shipping_provider_eligibility (
    id TEXT PRIMARY KEY,
    provider_id TEXT,
    matrix_id TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (provider_id) REFERENCES shipping_providers(id),
    FOREIGN KEY (matrix_id) REFERENCES shipping_method_region_matrix(id)
  );

  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    status TEXT
  );

  CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    description TEXT
  );

  CREATE TABLE user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(role_id) REFERENCES roles(id)
  );

  CREATE TABLE role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT,
    permission TEXT, -- e.g., 'orders:read'
    conditions TEXT, -- JSON string for attribute checks
    FOREIGN KEY(role_id) REFERENCES roles(id)
  );

  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    tracking_id TEXT,
    status TEXT,
    payment_status TEXT,
    bulk_id TEXT,
    destination TEXT,
    cost DECIMAL,
    metas TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

  // Insert some seed data
  const regionAId = uuidv4();
  const regionBId = uuidv4();
  const classId = uuidv4();
  const methodId = uuidv4();
  const providerId = uuidv4();
  const matrixId = uuidv4();

  const roleAdminId = uuidv4();
  const roleManagerId = uuidv4();
  const roleUserId = uuidv4();

  const adminHashed = bcrypt.hashSync("admin", 10);
  const userHashed = bcrypt.hashSync("user", 10);
  const adminId = uuidv4();
  const userId = uuidv4();

  db.exec(`
    INSERT INTO roles (id, name, description) VALUES
      ('${roleAdminId}', 'admin', 'Global Administrator'),
      ('${roleManagerId}', 'manager', 'Operations Manager'),
      ('${roleUserId}', 'user', 'Standard User');

    INSERT INTO role_permissions (id, role_id, permission, conditions) VALUES
      ('${uuidv4()}', '${roleAdminId}', '*:*', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:read', null),
      ('${uuidv4()}', '${roleManagerId}', 'orders:write', '{"cost": {"$lt": 1000}}'),
      ('${uuidv4()}', '${roleUserId}', 'orders:read', '{"user_id": "$user_id"}');

    INSERT INTO users (id, name, email, password, status) VALUES
      ('${adminId}', 'Admin User', 'admin@admin.com', '${adminHashed}', 'active'),
      ('${userId}', 'Regular User', 'user@admin.com', '${userHashed}', 'active');

    INSERT INTO user_roles (id, user_id, role_id) VALUES
      ('${uuidv4()}', '${adminId}', '${roleAdminId}'),
      ('${uuidv4()}', '${userId}', '${roleUserId}');

    INSERT INTO shipping_regions (id, name, country_code, metas) VALUES 
      ('${regionAId}', 'Muscat', 'OM', '{"ar:title": "مسقط"}'),
      ('${regionBId}', 'Salalah', 'OM', '{"ar:title": "صلالة"}');
    
    INSERT INTO shipping_classes (id, name, description) VALUES
      ('${classId}', 'Standard Parcel', 'Regular non-fragile items');

    INSERT INTO shipping_methods (id, name, shipping_class_id, base_cost, cost_per_kg, cost_per_m2, is_active, metas) VALUES
      ('${methodId}', 'Express Air', '${classId}', 15.0, 5.0, 2.0, 1, '{"image": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5947?w=400", "ar:title": "الشحن الجوي السريع"}');

    INSERT INTO shipping_method_classes (id, shipping_method_id, shipping_class_id) VALUES
      ('${uuidv4()}', '${methodId}', '${classId}');

    INSERT INTO shipping_method_region_matrix (
      id, from_region_id, to_region_id, shipping_method_id, base_cost_override, estimated_days, is_active
    ) VALUES (
      '${matrixId}', '${regionAId}', '${regionBId}', '${methodId}', 25.0, 3, 1
    );

    INSERT INTO shipping_providers (id, name, type, status) VALUES
      ('${providerId}', 'GlobalFreight', 'air', 'active');

    INSERT INTO shipping_provider_eligibility (id, provider_id, matrix_id) 
    SELECT '${uuidv4()}', '${providerId}', id 
    FROM shipping_method_region_matrix 
    LIMIT 1;

    INSERT INTO orders (id, tracking_id, status, payment_status, destination, cost, metas) VALUES
      ('${uuidv4()}', 'SC-77421', 'In Transit', 'complete', 'London, UK', 45.50, '{"creator_type": "pos"}'),
      ('${uuidv4()}', 'SC-88912', 'Delivered', 'complete', 'New York, USA', 1200.00, '{"creator_type": "customer"}');
  `);


async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Helper for Attribute-Based Evaluation
  const evaluateAttributeRule = (ruleStr: string, data: any) => {
    if (!ruleStr) return true;
    try {
      const rule = JSON.parse(ruleStr);
      return Object.entries(rule).every(([key, condition]: [string, any]) => {
        const value = data[key];
        
        // Handle array status check: orders.status=['canceled']
        if (Array.isArray(condition)) {
          return condition.includes(value);
        }

        // Handle direct values or boolean: orders.status=true
        if (typeof condition !== 'object') {
          return value === condition;
        }

        // Handle operators: >=2, $gte, $in, etc.
        const ops = Object.entries(condition);
        return ops.every(([op, opVal]: [string, any]) => {
          switch (op) {
            case '$eq': return value === opVal;
            case '$neq': return value !== opVal;
            case '$gt': return value > opVal;
            case '$gte': return value >= opVal;
            case '$lt': return value < opVal;
            case '$lte': return value <= opVal;
            case '$in': return Array.isArray(opVal) && opVal.includes(value);
            case '$includes': return Array.isArray(value) && value.includes(opVal);
            default: return false;
          }
        });
      });
    } catch (e) {
      console.error("Rule evaluation error:", e);
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

    // Inject user context into conditions if needed
    const context = { ...resourceData, user_id: user.id };
    
    return matches.some(p => {
       let conditions = p.conditions;
       if (conditions) {
         // Replace $user_id with actual ID
         conditions = conditions.replace(/\$user_id/g, user.id);
       }
       return evaluateAttributeRule(conditions, context);
    });
  };

  // Middleware
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

  // --- API Routes ---
  app.get("/api/regions", (req, res) => {
    const regions = db.prepare("SELECT * FROM shipping_regions").all();
    res.json(regions);
  });

  app.get("/api/classes", (req, res) => {
    const classes = db.prepare("SELECT * FROM shipping_classes").all();
    res.json(classes);
  });

  app.post("/api/calculate-shipping", (req, res) => {
    const { fromRegionId, toRegionId, classId, weight, sizeM2 } = req.body;
    
    // Find valid methods
    const validMethods = db.prepare(`
      SELECT * FROM shipping_methods 
      WHERE (shipping_class_id = ? OR id IN (SELECT shipping_method_id FROM shipping_method_classes WHERE shipping_class_id = ?))
      AND is_active = 1
    `).all(classId, classId);

    const routes = [];

    for (const method of validMethods as any[]) {
      // Find matrix route
      const matrix = db.prepare(`
        SELECT * FROM shipping_method_region_matrix 
        WHERE from_region_id = ? AND to_region_id = ? AND shipping_method_id = ? AND is_active = 1
      `).get(fromRegionId, toRegionId, method.id);

      if (matrix) {
        const m = matrix as any;
        const baseCost = m.base_cost_override ?? method.base_cost;
        const costPerKg = m.cost_per_kg_override ?? method.cost_per_kg;
        const costPerM2 = m.cost_per_m2_override ?? method.cost_per_m2;
        
        const total = baseCost + (weight * costPerKg) + (sizeM2 * costPerM2);
        
        // Find strategies
        const strategies = db.prepare(`
          SELECT * FROM shipping_strategies WHERE matrix_id = ? ORDER BY priority ASC
        `).all(m.id);

        routes.push({
          method,
          matrix: m,
          total,
          strategies
        });
      }
    }

    res.json(routes);
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

  // --- Admin API Routes ---
  app.get("/api/admin/methods", authorize("methods:read"), (req, res) => {
    const methods = db.prepare("SELECT * FROM shipping_methods").all();
    res.json(methods.map((m: any) => ({ ...m, metas: m.metas ? JSON.parse(m.metas) : {} })));
  });

  app.get("/api/admin/regions", authorize("regions:read"), (req, res) => {
    const regions = db.prepare("SELECT * FROM shipping_regions").all();
    res.json(regions.map((r: any) => ({ ...r, metas: r.metas ? JSON.parse(r.metas) : {} })));
  });

  app.get("/api/admin/matrix", authorize("matrix:read"), (req, res) => {
    const matrix = db.prepare(`
      SELECT m.*, fr.name as from_region_name, tr.name as to_region_name, sm.name as method_name
      FROM shipping_method_region_matrix m
      JOIN shipping_regions fr ON m.from_region_id = fr.id
      JOIN shipping_regions tr ON m.to_region_id = tr.id
      JOIN shipping_methods sm ON m.shipping_method_id = sm.id
    `).all();
    res.json(matrix);
  });

  app.get("/api/admin/providers", authorize("providers:read"), (req, res) => {
    const providers = db.prepare("SELECT * FROM shipping_providers").all();
    res.json(providers.map((p: any) => ({ ...p, metas: p.metas ? JSON.parse(p.metas) : {} })));
  });

  app.get("/api/admin/eligibility", authorize("eligibility:read"), (req, res) => {
    const eligibility = db.prepare(`
      SELECT 
        spe.*, 
        sp.name as provider_name,
        sm.name as method_name,
        r1.name as from_region,
        r2.name as to_region
      FROM shipping_provider_eligibility spe
      JOIN shipping_providers sp ON spe.provider_id = sp.id
      JOIN shipping_method_region_matrix m ON spe.matrix_id = m.id
      JOIN shipping_methods sm ON m.shipping_method_id = sm.id
      JOIN shipping_regions r1 ON m.from_region_id = r1.id
      JOIN shipping_regions r2 ON m.to_region_id = r2.id
    `).all();
    res.json(eligibility);
  });

  app.get("/api/admin/users", authorize("users:read"), (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.get("/api/admin/orders", authorize("orders:read"), (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders.map((o: any) => ({ ...o, metas: o.metas ? JSON.parse(o.metas) : {} })));
  });

  // --- Admin CRUD Endpoints ---

  // Shipping Methods
  app.post("/api/admin/methods", authorize("methods:write"), (req, res) => {
    const { name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, metas } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO shipping_methods (id, name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, metas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, JSON.stringify(metas || {}));
    res.json({ id, name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, metas });
  });

  app.put("/api/admin/methods/:id", authorize("methods:write"), (req, res) => {
    const { name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, metas } = req.body;
    db.prepare("UPDATE shipping_methods SET name = ?, shipping_class_id = ?, shipping_class = ?, base_cost = ?, cost_per_kg = ?, cost_per_m2 = ?, metas = ? WHERE id = ?")
      .run(name, shipping_class_id, shipping_class, base_cost, cost_per_kg, cost_per_m2, JSON.stringify(metas || {}), req.params.id);
    res.json({ success: true });
  });

  // Shipping Regions
  app.post("/api/admin/regions", authorize("regions:write"), (req, res) => {
    const { name, country_code, metas } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO shipping_regions (id, name, country_code, metas) VALUES (?, ?, ?, ?)")
      .run(id, name, country_code, JSON.stringify(metas || {}));
    res.json({ id, name, country_code, metas });
  });

  app.put("/api/admin/regions/:id", authorize("regions:write"), (req, res) => {
    const { name, country_code, metas } = req.body;
    db.prepare("UPDATE shipping_regions SET name = ?, country_code = ?, metas = ? WHERE id = ?")
      .run(name, country_code, JSON.stringify(metas || {}), req.params.id);
    res.json({ success: true });
  });

  // Matrix
  app.post("/api/admin/matrix", authorize("matrix:write"), (req, res) => {
    const { from_region_id, to_region_id, shipping_method_id, base_cost_override, cost_per_kg_override, cost_per_m2_override } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO shipping_method_region_matrix (id, from_region_id, to_region_id, shipping_method_id, base_cost_override, cost_per_kg_override, cost_per_m2_override) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, from_region_id, to_region_id, shipping_method_id, base_cost_override, cost_per_kg_override, cost_per_m2_override);
    res.json({ success: true });
  });

  app.put("/api/admin/matrix/:id", authorize("matrix:write"), (req, res) => {
    const { from_region_id, to_region_id, shipping_method_id, base_cost_override, cost_per_kg_override, cost_per_m2_override } = req.body;
    db.prepare("UPDATE shipping_method_region_matrix SET from_region_id = ?, to_region_id = ?, shipping_method_id = ?, base_cost_override = ?, cost_per_kg_override = ?, cost_per_m2_override = ? WHERE id = ?")
      .run(from_region_id, to_region_id, shipping_method_id, base_cost_override, cost_per_kg_override, cost_per_m2_override, req.params.id);
    res.json({ success: true });
  });

  // Providers
  app.post("/api/admin/providers", authorize("providers:write"), (req, res) => {
    const { name, type, status, metas } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO shipping_providers (id, name, type, status, metas) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, type, status, JSON.stringify(metas || {}));
    res.json({ success: true });
  });

  app.put("/api/admin/providers/:id", authorize("providers:write"), (req, res) => {
    const { name, type, status, metas } = req.body;
    db.prepare("UPDATE shipping_providers SET name = ?, type = ?, status = ?, metas = ? WHERE id = ?")
      .run(name, type, status, JSON.stringify(metas || {}), req.params.id);
    res.json({ success: true });
  });

  // Eligibility
  app.post("/api/admin/eligibility", authorize("eligibility:write"), (req, res) => {
    const { provider_id, matrix_id, is_active } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO shipping_provider_eligibility (id, provider_id, matrix_id, is_active) VALUES (?, ?, ?, ?)")
      .run(id, provider_id, matrix_id, is_active ? 1 : 0);
    res.json({ success: true });
  });

  app.put("/api/admin/eligibility/:id", authorize("eligibility:write"), (req, res) => {
    const { provider_id, matrix_id, is_active } = req.body;
    db.prepare("UPDATE shipping_provider_eligibility SET provider_id = ?, matrix_id = ?, is_active = ? WHERE id = ?")
      .run(provider_id, matrix_id, is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Users
  app.post("/api/admin/users", authorize("users:write"), (req, res) => {
    const { name, email, status } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO users (id, name, email, status) VALUES (?, ?, ?, ?)")
      .run(id, name, email, status);
    res.json({ success: true });
  });

  app.put("/api/admin/users/:id", authorize("users:write"), (req, res) => {
    const { name, email, status } = req.body;
    db.prepare("UPDATE users SET name = ?, email = ?, status = ? WHERE id = ?")
      .run(name, email, status, req.params.id);
    res.json({ success: true });
  });

  // Orders
  app.post("/api/admin/orders", authorize("orders:write"), (req, res) => {
    const { tracking_id, status, payment_status, destination, cost, metas } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO orders (id, tracking_id, status, payment_status, destination, cost, metas) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, tracking_id, status, payment_status, destination, cost, JSON.stringify(metas || {}));
    res.json({ success: true });
  });

  // Bulk Orders
  app.post("/api/admin/orders/bulk", authorize("orders:write"), (req, res) => {
    const { orders } = req.body;
    const bulkId = `BLK-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const insert = db.prepare("INSERT INTO orders (id, tracking_id, status, payment_status, destination, cost, bulk_id, metas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    const transaction = db.transaction((orderList) => {
      for (const order of orderList) {
        const id = uuidv4();
        insert.run(
          id, 
          order.tracking_id, 
          order.status || 'Draft', 
          order.payment_status || 'pending', 
          order.destination, 
          order.cost, 
          bulkId, 
          JSON.stringify(order.metas || {})
        );
      }
    });

    transaction(orders);
    res.json({ success: true, bulk_id: bulkId });
  });

  app.put("/api/admin/orders/:id", authorize("orders:write"), (req, res) => {
    const { tracking_id, status, payment_status, destination, cost, metas } = req.body;
    db.prepare("UPDATE orders SET tracking_id = ?, status = ?, payment_status = ?, destination = ?, cost = ?, metas = ? WHERE id = ?")
      .run(tracking_id, status, payment_status, destination, cost, JSON.stringify(metas || {}), req.params.id);
    res.json({ success: true });
  });

  // Delete generic endpoint
  app.delete("/api/admin/:type/:id", authorize("*:write"), (req, res) => {
    const { type, id } = req.params;
    const tableMap: Record<string, string> = {
      methods: 'shipping_methods',
      regions: 'shipping_regions',
      matrix: 'shipping_method_region_matrix',
      providers: 'shipping_providers',
      eligibility: 'shipping_provider_eligibility',
      users: 'users',
      orders: 'orders'
    };
    const table = tableMap[type];
    if (table) {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid type" });
    }
  });

  app.get("/api/admin/analytics", (req, res) => {
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as any;
    const totalRevenue = db.prepare("SELECT SUM(cost) as sum FROM orders").get() as any;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as any;
    
    res.json({
      orderCount: orderCount.count,
      totalRevenue: totalRevenue.sum || 0,
      activeUsers: activeUsers.count,
      shippingDistribution: [
        { name: 'Air', value: 400 },
        { name: 'Sea', value: 300 },
        { name: 'Land', value: 300 },
      ]
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
