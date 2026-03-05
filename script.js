const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const WHATSAPP_NUMBER = "584143126327";

let allProducts = [];
let cart = []; // Estructura: { name, price, qty }
let currentPage = 1;
const productsPerPage = 12;

async function init() {
    const proveedores = ["Proveedor_A", "Proveedor_B"];
    try {
        for (const prov of proveedores) {
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
            const res = await fetch(url);
            const csv = await res.text();
            const rows = csv.split("\n").slice(1);
            rows.forEach(row => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 3 && cols[0].trim() !== "") {
                    allProducts.push({
                        nombre: cols[0].replace(/"/g, "").trim(),
                        desc: cols[1] ? cols[1].replace(/"/g, "").trim() : "",
                        precio: parseFloat(cols[2]?.replace(/"/g, "").trim()) || 0,
                        img: cols[3] ? cols[3].replace(/"/g, "").trim() : "",
                        etiqueta: cols[4] ? cols[4].replace(/"/g, "").trim() : ""
                    });
                }
            });
        }
        document.getElementById("loader").style.display = "none";
        renderProducts();
        setupSearch();
        setupFormValidation();
    } catch (e) { console.error("Error:", e); }
}

function renderProducts(filteredList = null) {
    const grid = document.getElementById("product-grid");
    const list = filteredList || allProducts;
    const paginatedItems = list.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

    grid.innerHTML = paginatedItems.map(p => `
        <div class="card">
            ${p.etiqueta ? `<span class="badge-personalizado">${p.etiqueta}</span>` : ''}
            <div class="card-img-container"><img src="${p.img || 'https://via.placeholder.com/300'}" alt="${p.nombre}"></div>
            <h3 style="font-size: 0.9rem; font-weight: 800;">${p.nombre}</h3>
            <p style="font-size: 0.75rem; color: #666; margin: 10px 0;">${p.desc}</p>
            <div class="price">$${p.precio.toFixed(2)}</div>
            <button class="btn-add" onclick="addToCart('${p.nombre.replace(/'/g, "\\'")}', ${p.precio})">Añadir al pedido</button>
        </div>
    `).join("");
}

// LOGICA DE CANTIDADES
function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, qty: 1 });
    }
    updateCartUI();
    if (!document.getElementById("cart-panel").classList.contains("active")) toggleCart();
}

function updateCartUI() {
    const cartCount = document.getElementById("cart-count");
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total-value");
    
    cartCount.innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    
    let totalMoney = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        const subtotal = item.price * item.qty;
        totalMoney += subtotal;
        return `
            <div class="cart-item-row">
                <div style="display: flex; align-items: center;">
                    <span class="qty-badge">${item.qty}x</span>
                    <div>
                        <div style="font-weight: 700; font-size: 0.8rem;">${item.name}</div>
                        <div style="color: #d4af37; font-size: 0.75rem;">$${subtotal.toFixed(2)}</div>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ccc; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join("");
    cartTotal.innerText = totalMoney.toFixed(2);
    validateForm();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCart() { document.getElementById("cart-panel").classList.toggle("active"); }

function setupFormValidation() {
    ['cust-name', 'cust-id', 'cust-phone', 'cust-address'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateForm);
    });
}

function validateForm() {
    const n = document.getElementById('cust-name').value.trim();
    const i = document.getElementById('cust-id').value.trim();
    const p = document.getElementById('cust-phone').value.trim();
    const a = document.getElementById('cust-address').value.trim();
    const btn = document.getElementById('btn-finalize');
    const isValid = n.length > 3 && i.length > 5 && p.length > 7 && a.length > 5 && cart.length > 0;
    btn.disabled = !isValid;
    btn.classList.toggle('disabled', !isValid);
}

function processOrder() {
    const n = document.getElementById('cust-name').value;
    const i = document.getElementById('cust-id').value;
    const p = document.getElementById('cust-phone').value;
    const a = document.getElementById('cust-address').value;
    const t = document.getElementById('cart-total-value').innerText;

    let prodTxt = cart.map(item => `${item.qty}x ${item.name} ($${(item.price*item.qty).toFixed(2)})`).join('%0A');
    const msg = `*NUEVO PEDIDO - EL IZQUIERDO C.A*%0A%0A*Cliente:* ${n}%0A*CI/RIF:* ${i}%0A*Dir:* ${a}%0A%0A*Productos:*%0A${prodTxt}%0A%0A*TOTAL: $${t}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');

    // LIMPIEZA AUTOMÁTICA
    setTimeout(() => {
        cart = [];
        updateCartUI();
        ['cust-name', 'cust-id', 'cust-phone', 'cust-address'].forEach(id => document.getElementById(id).value = "");
        validateForm(); toggleCart();
    }, 1200);
}

function setupSearch() {
    document.getElementById("searchInput").addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(term));
        renderProducts(filtered);
    });
}

function consultarServicios() {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hola El Izquierdo C.A, solicito información de servicios técnicos.`, '_blank');
}

document.addEventListener("DOMContentLoaded", init);