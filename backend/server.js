require("dotenv").config();
console.log(process.env.BANK_CODE);
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const pool = require("./db");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json({

    verify: (req, res, buf) => {

        req.rawBody = buf.toString();

    }

}));

/*
=====================================
GET PRODUCTS
=====================================
*/

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT * FROM products
            ORDER BY id ASC
        `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

/*
=====================================
CREATE ORDER
=====================================
*/

app.post("/create-order", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        error: "Cart empty",
      });
    }

    let totalAmount = 0;

    const orderItems = [];

    /*
        ==========================
        TÍNH TOTAL TỪ DB
        ==========================
        */

    for (const item of items) {
      const productResult = await pool.query(
        `
                SELECT * FROM products
                WHERE id = $1
                `,
        [item.productId],
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      const product = productResult.rows[0];

      const itemTotal = product.price * item.quantity;

      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    /*
        ==========================
        TẠO MÃ ĐƠN
        ==========================
        */

    const orderCode =
      "DON" + Math.random().toString(36).substring(2, 8).toUpperCase();

    /*
        ==========================
        INSERT ORDER
        ==========================
        */

    const orderResult = await pool.query(
      `
            INSERT INTO orders(
                order_code,
                total_amount
            )
            VALUES($1, $2)
            RETURNING *
            `,
      [orderCode, totalAmount],
    );

    const order = orderResult.rows[0];

    /*
        ==========================
        INSERT ORDER ITEMS
        ==========================
        */

    for (const item of orderItems) {
      await pool.query(
        `
                INSERT INTO order_items(
                    order_id,
                    product_id,
                    quantity,
                    price
                )
                VALUES($1, $2, $3, $4)
                `,
        [order.id, item.productId, item.quantity, item.price],
      );
    }

    /*
        ==========================
        QR VIETQR THẬT
        ==========================
        */

    const qrImage =
      `https://img.vietqr.io/image/${process.env.BANK_CODE}-${process.env.BANK_ACCOUNT}-compact2.png` +
      `?amount=${totalAmount}` +
      `&addInfo=${orderCode}`;

    /*
        ==========================
        RESPONSE
        ==========================
        */

    res.json({
      success: true,

      orderCode,

      totalAmount,

      qrImage,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

/*
=====================================
SEPAY WEBHOOK
=====================================
*/

app.post("/sepay-webhook", async (req, res) => {
  try {
    /*
        ==========================
        SIGNATURE HEADER
        ==========================
        */

    const signature =
    req.headers['x-sepay-signature']
        ?.replace('sha256=', '');

    /*
        ==========================
        SECRET KEY
        ==========================
        */

    const secretKey = process.env.SEPAY_SECRET_KEY;

    /*
        ==========================
        RAW BODY
        ==========================
        */

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
            secretKey
        )
        .update(signedPayload)
        .digest('hex');

    /*
        ==========================
        VERIFY SIGNATURE
        ==========================
        */

    if (signature !== expectedSignature) {
      console.log("Invalid signature");

      return res.status(401).json({
        error: "Invalid signature",
      });
    }

    console.log("Webhook verified:", req.body);

    /*
        ==========================
        DỮ LIỆU TỪ SEPAY
        ==========================
        */

    const { content, transferAmount } = req.body;

    /*
        ==========================
        TÌM ORDER
        ==========================
        */

    const orderResult = await pool.query(
      `
            SELECT * FROM orders
            WHERE order_code = $1
            `,
      [content],
    );

    if (orderResult.rows.length === 0) {
      return res.json({
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    /*
        ==========================
        CHECK ĐÃ PAID?
        ==========================
        */

    if (order.status === "paid") {
      return res.json({
        message: "Already paid",
      });
    }

    /*
        ==========================
        CHECK SỐ TIỀN
        ==========================
        */

    if (Number(transferAmount) !== Number(order.total_amount)) {
      return res.json({
        message: "Wrong amount",
      });
    }

    /*
        ==========================
        UPDATE DB
        ==========================
        */

    await pool.query(
      `
            UPDATE orders
            SET status = 'paid'
            WHERE order_code = $1
            `,
      [content],
    );

    /*
        ==========================
        REALTIME POPUP
        ==========================
        */

    io.emit("payment-success", {
      orderCode: order.order_code,

      amount: order.total_amount,
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

/*
=====================================
SOCKET
=====================================
*/

io.on("connection", (socket) => {
  console.log("Client connected");
});

/*
=====================================
START SERVER
=====================================
*/

server.listen(3000, () => {
  console.log("Server running: http://localhost:3000");
});
