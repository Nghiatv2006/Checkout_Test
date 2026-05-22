
PAYMENT DEMO - SETUP & ARCHITECTURE
==================================

TECH STACK
-----------
Frontend:
- HTML
- CSS
- Vanilla JavaScript
- Socket.IO client

Backend:
- NodeJS
- ExpressJS
- Socket.IO
- PostgreSQL

Payment:
- SePay Webhook
- VietQR
- Cloudflare Tunnel


PROJECT STRUCTURE
-----------------

payment-demo/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── node_modules/
│
└── frontend/
    ├── index.html
    ├── app.js
    └── style.css


POSTGRESQL DATABASE
-------------------

Database name:
payment_demo

Tables:
- products
- orders
- order_items


PRODUCTS TABLE
--------------

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL
);


ORDERS TABLE
------------

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_code TEXT UNIQUE NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);


ORDER ITEMS TABLE
-----------------

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL
);


SAMPLE PRODUCTS
---------------

INSERT INTO products(name, price)
VALUES
('VIP', 2000),
('COIN', 5000),
('PRO', 10000);


ENV FILE
---------

PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=payment_demo

SEPAY_SECRET_KEY=whsec_xxxxx

BANK_CODE=MB
BANK_ACCOUNT=009xxxx


GITIGNORE
----------

node_modules
.env


IMPORTANT NPM PACKAGES
----------------------

npm install express
npm install cors
npm install socket.io
npm install pg
npm install dotenv


BACKEND FEATURES
----------------

1. Load products from PostgreSQL
2. Create order
3. Generate VietQR
4. Receive SePay webhook
5. Verify HMAC SHA256 signature
6. Update order status
7. Emit realtime socket event
8. Frontend popup payment success


SEPAY WEBHOOK SECURITY
----------------------

Use:
X-SePay-Signature

Use:
X-SePay-Timestamp

Signature format:
sha256=HASH

Need:
- raw request body
- timestamp + "." + rawBody
- HMAC SHA256


IMPORTANT EXPRESS CONFIG
------------------------

app.use(express.json({

    verify: (req, res, buf) => {

        req.rawBody = buf.toString();

    }

}));


SIGNATURE VERIFY
----------------

const signature =
    req.headers['x-sepay-signature']
        ?.replace('sha256=', '');

const timestamp =
    req.headers['x-sepay-timestamp'];

const rawBody =
    req.rawBody;

const signedPayload =
    timestamp + '.' + rawBody;

const expectedSignature =
    crypto
        .createHmac(
            'sha256',
            process.env.SEPAY_SECRET_KEY
        )
        .update(signedPayload)
        .digest('hex');


CLOUDFLARE TUNNEL
-----------------

Backend:
cloudflared tunnel --url http://localhost:3000

Frontend:
cloudflared tunnel --url http://localhost:5500


CÁCH CHẠY TRONG VS CODE
-----------------
FRONTEND: npx serve -l 5500  
BACKEND: node server.js

Sau khi chạy xong thì chạy CLOUDFLARE TUNNEL 

FRONTEND FEATURES
-----------------

1. Product list
2. Quantity increase/decrease
3. QR payment popup
4. 5-minute countdown
5. Auto close QR after timeout
6. Auto close QR after payment
7. Realtime payment popup


CURRENT FLOW
------------

User opens website
↓
Select product
↓
Create order
↓
Backend generates QR
↓
Frontend shows QR
↓
User transfers money
↓
SePay webhook sent
↓
Backend verifies signature
↓
Update DB
↓
Socket.IO emit
↓
Frontend popup success


NEXT POSSIBLE UPGRADES
----------------------

1. Virtual Account (VA)
2. JWT login
3. User balance system
4. Admin dashboard
5. Payment history
6. Docker deployment
7. VPS deployment
8. Nginx reverse proxy
9. HTTPS domain
10. Redis queue
