const API =
'https://collectors-push-flights-committee.trycloudflare.com';

const socket = io(API);

const productsDiv =
    document.getElementById('products');

const paymentArea =
    document.getElementById('paymentArea');

const checkoutBtn =
    document.getElementById('checkoutBtn');



/*
====================================
GIỎ HÀNG
====================================
*/

const cart = {};



/*
====================================
LOAD PRODUCTS
====================================
*/

async function loadProducts() {

    const res =
        await fetch(`${API}/products`);

    const products =
        await res.json();



    for (const product of products) {

        cart[product.id] = 0;

        const div =
            document.createElement('div');

        div.className = 'product';

        div.innerHTML = `

            <h2>${product.name}</h2>

            <p>
                Giá:
                ${product.price.toLocaleString()}đ
            </p>

            <div class="qty-box">

                <button onclick="changeQty(${product.id}, -1)">
                    -
                </button>

                <span id="qty-${product.id}">
                    0
                </span>

                <button onclick="changeQty(${product.id}, 1)">
                    +
                </button>

            </div>

        `;

        productsDiv.appendChild(div);

    }

}

loadProducts();



/*
====================================
TĂNG GIẢM
====================================
*/

window.changeQty = (id, amount) => {

    cart[id] += amount;

    if (cart[id] < 0) {

        cart[id] = 0;

    }

    document.getElementById(
        `qty-${id}`
    ).innerText = cart[id];

};



/*
====================================
CHECKOUT
====================================
*/

let currentOrderCode = null;
let countdownInterval = null;

checkoutBtn.onclick = async () => {

    const items = [];



    for (const productId in cart) {

        if (cart[productId] > 0) {

            items.push({

                productId:
                    Number(productId),

                quantity:
                    cart[productId]

            });

        }

    }



    if (items.length === 0) {

        alert('Chưa chọn sản phẩm');

        return;

    }



    const res = await fetch(
        `${API}/create-order`,
        {

            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({
                items
            })

        }
    );



    const data = await res.json();

    currentOrderCode =
        data.orderCode;



    paymentArea.innerHTML = `

    <div id="qrBox">

        <h2>
            Tổng tiền:
            ${data.totalAmount.toLocaleString()}đ
        </h2>

        <p>
            Nội dung CK:
            <b>${data.orderCode}</b>
        </p>

        <h3 id="countdown">
            05:00
        </h3>

        <img
            src="${data.qrImage}"
            width="300"
        >

    </div>

`;

let timeLeft = 300;

clearInterval(countdownInterval);

countdownInterval = setInterval(() => {

    timeLeft--;

    const minutes =
        String(
            Math.floor(timeLeft / 60)
        ).padStart(2, '0');

    const seconds =
        String(
            timeLeft % 60
        ).padStart(2, '0');

    const countdownEl =
        document.getElementById(
            'countdown'
        );

    if (countdownEl) {

        countdownEl.innerText =
            `${minutes}:${seconds}`;

    }

    if (timeLeft <= 0) {

        clearInterval(
            countdownInterval
        );

        paymentArea.innerHTML = `

            <h2>
                Giao dịch đã hết hạn
            </h2>

        `;

    }

}, 1000);

};



/*
====================================
FAKE PAYMENT
====================================
*/

window.fakePay = async () => {

    await fetch(
        `${API}/fake-payment`,
        {

            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({

                orderCode:
                    currentOrderCode

            })

        }
    );

};



/*
====================================
SOCKET REALTIME
====================================
*/

socket.on(
    'payment-success',
    (data) => {
        clearInterval(countdownInterval);

paymentArea.innerHTML = '';

        const popup =
            document.createElement('div');

        popup.className =
            'popup';

        popup.innerText =
            `Thanh toán thành công ${data.amount.toLocaleString()}đ`;

        document.body.appendChild(
            popup
        );

        setTimeout(() => {

            popup.remove();

        }, 5000);

    }
);