const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymLB7fnfcIrsumvpH3J9UMKJG_Z8-sJrUc5OxVNeUssfb6TGtay0EH-H-q1oDNTB0J/exec"; 
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"];
const WHATSAPP_NUMBER = "584143126327";

let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
const productsPerPage = 12;

async function init() {
    const loader = document.getElementById("loader");
    allProducts = [];

    for (const prov of PROVEEDORES) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
        try {
            const res = await fetch(URL);
            const csv = await res.text();
            const rows = csv.split("\n").slice(1);
            rows.forEach((row) => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 5) {
                    allProducts.push({
                        nombre: cols[0].replace(/"/g, "").trim(),
                        desc: cols[1].replace(/"/g, "").trim(),
                        precio: parseFloat(cols[2].replace(/"/g, "").trim()) || 0,
                        img: cols[3].replace(/"/g, "").trim(),
                        etiqueta: cols[4] ? cols[4].replace(/"/g, "").trim() : "",
                    });
                }
            });
        } catch (e) { console.error("Error cargando proveedor", e); }
    }

    if (loader) loader.style.display = "none";
    filteredProducts = [...allProducts];
    updateDisplay();
    setupValidation(); 
}

function updateDisplay() {
    const startIndex = (currentPage - 1) * productsPerPage;
    const productsToDisplay = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    const grid = document.getElementById("product-grid");

    grid.innerHTML = productsToDisplay.map((p) => {
        const badgeHTML = p.etiqueta && p.etiqueta.length > 2 ? `<span class="badge-personalizado">${p.etiqueta}</span>` : "";
        return `
            <div class="card">
                <div class="card-img-container">
                    <img src="${p.img}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Imagen'">
                    ${badgeHTML}
                </div>
                <h3>${p.nombre}</h3>
                <p>${p.desc}</p>
                <div class="price">$${p.precio.toFixed(2)}</div>
                <button class="btn-add" onclick="addToCart('${p.nombre.replace(/'/g, "\\'")}', ${p.precio})">Añadir al Pedido</button>
            </div>`;
    }).join("");
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination-controls");
    if(!container) return;
    container.innerHTML = "";
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = `page-btn ${currentPage === i ? "active" : ""}`;
        btn.onclick = () => {
            currentPage = i;
            updateDisplay();
            document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
        };
        container.appendChild(btn);
    }
}

// BÚSQUEDA
document.getElementById("searchInput").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter((p) => p.nombre.toLowerCase().includes(term));
    currentPage = 1;
    updateDisplay();
});

// GESTIÓN DE CARRITO
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
    validateForm();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    validateForm();
}

function clearFullCart() {
    cart = [];
    updateCartUI();
    validateForm();
}

function updateCartUI() {
    const itemsDiv = document.getElementById("cart-items");
    const countSpan = document.getElementById("cart-count");
    countSpan.innerText = cart.length;

    if (cart.length === 0) {
        itemsDiv.innerHTML = `<p style="text-align:center; padding:20px; font-size:0.8rem; color:#999;">Vacío</p>`;
        document.getElementById("cart-total-value").innerText = "0.00";
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                <div style="flex:1; font-size:0.75rem;">
                    <b>${item.name}</b><br>$${item.price.toFixed(2)}
                </div>
                <button onclick="removeFromCart(${index})" style="color:#ff4757; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>`;
    }).join("");
    
    itemsDiv.innerHTML += `<button onclick="clearFullCart()" style="width:100%; margin-top:10px; padding:5px; font-size:0.7rem; cursor:pointer; border:1px solid #ddd; background:#fff;">Vaciar todo</button>`;
    document.getElementById("cart-total-value").innerText = total.toFixed(2);
}

// VALIDACIÓN
function setupValidation() {
    ['cust-name', 'cust-id', 'cust-phone', 'cust-address'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateForm);
    });
}

function validateForm() {
    const name = document.getElementById('cust-name').value.trim();
    const id = document.getElementById('cust-id').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const addr = document.getElementById('cust-address').value.trim();
    const btn = document.getElementById('btn-finalize');

    if (name && id && phone && addr && cart.length > 0) {
        btn.disabled = false;
        btn.classList.remove('disabled');
    } else {
        btn.disabled = true;
        btn.classList.add('disabled');
    }
}

function toggleCart() {
    document.getElementById("cart-panel").classList.toggle("active");
}

// PROCESAR Y LIMPIAR
async function processOrder() {
    const name = document.getElementById('cust-name').value;
    const id = document.getElementById('cust-id').value;
    const phone = document.getElementById('cust-phone').value;
    const addr = document.getElementById('cust-address').value;
    const total = document.getElementById('cart-total-value').innerText;

    const pedidoData = {
        cliente: name, 
        cedula: id, 
        telefono: phone, 
        direccion: addr,
        productos: cart.map(i => i.name).join(', '), 
        total: total
    };

    // Envío a Sheets
    try {
        fetch(APPS_SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(pedidoData) 
        });
    } catch (e) { console.error("Error Sheets"); }

    // Formateo WhatsApp
    let msg = `Hola el izquierdo c.a, nuevo pedido:%0A%0A`;
    msg += `👤 Cliente: ${name}%0A💳 CI: ${id}%0A📞 Tlf: ${phone}%0A📍 Dir: ${addr}%0A%0A*PRODUCTOS:*%0A`;
    cart.forEach((i, idx) => msg += `${idx + 1}. ${i.name} ($${i.price.toFixed(2)})%0A`);
    msg += `%0A💰 *TOTAL: $${total}*`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    // LIMPIEZA TOTAL (Formulario + Carrito)
    setTimeout(() => {
        cart = []; // Vaciar array del carrito
        updateCartUI(); // Refrescar visualmente el carrito
        
        // Limpiar campos del formulario
        document.getElementById('cust-name').value = ""; 
        document.getElementById('cust-id').value = "";
        document.getElementById('cust-phone').value = "";
        document.getElementById('cust-address').value = "";
        
        validateForm(); // Bloquear botón nuevamente
        toggleCart();   // Cerrar el panel del carrito
    }, 1000);
}

document.addEventListener("DOMContentLoaded", init);