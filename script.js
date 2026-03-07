/** * EL IZQUIERDO C.A - PRODUCCIÓN 2026 
 * Versión con miniaturas en carrito y validación automática.
 */

const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzk6y065jhrOKRqxif7XBOfSfak-iZo8LISCH0-p-99NeDgB2ZSf-pPDrvB9j_7QLakHQ/exec"; 
const AUTH_TOKEN = "IZQ_SECURE_2026_PRO";
const WHATSAPP_NUMBER = "584143126327";
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"];

let allProducts = [], filteredProducts = [], cart = [], currentPage = 1;
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
            rows.forEach(row => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 5) {
                    allProducts.push({
                        nombre: cols[0].replace(/"/g, "").trim(),
                        desc: cols[1].replace(/"/g, "").trim(),
                        precio: parseFloat(cols[2].replace(/"/g, "").trim()) || 0,
                        img: cols[3].replace(/"/g, "").trim(),
                        etiqueta: cols[4] ? cols[4].replace(/"/g, "").trim() : ""
                    });
                }
            });
        } catch (e) { console.error("Error cargando inventario"); }
    }
    if (loader) loader.style.display = "none";
    filteredProducts = [...allProducts];
    updateDisplay();
    setupValidation();
}

function updateDisplay() {
    const startIndex = (currentPage - 1) * productsPerPage;
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    
    grid.innerHTML = filteredProducts.slice(startIndex, startIndex + productsPerPage).map(p => {
        const badge = p.etiqueta.length > 2 ? `<span class="badge-personalizado">${p.etiqueta}</span>` : "";
        const is3D = p.img.includes("tripo3d.ai");
        const media = is3D 
            ? `<iframe src="${p.img}" style="width:100%; height:200px; border:none; border-radius:8px;"></iframe>`
            : `<img src="${p.img}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200'">`;
        
        return `<div class="card">
            <div class="card-img-container">${media}${badge}</div>
            <h3>${p.nombre}</h3>
            <p>${p.desc}</p>
            <div class="price">$${p.precio.toFixed(2)}</div>
            <button class="btn-add" onclick="addToCart('${p.nombre.replace(/'/g, "\\'")}', ${p.precio}, '${p.img}')">Añadir al Pedido</button>
        </div>`;
    }).join("");
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination-controls");
    if (!container) return;
    container.innerHTML = "";
    if (totalPages <= 1) return;
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = `page-btn ${currentPage === i ? "active" : ""}`;
        btn.onclick = () => { currentPage = i; updateDisplay(); window.scrollTo(0, 400); };
        container.appendChild(btn);
    }
}

// GESTIÓN DEL CARRITO CON IMAGEN
function addToCart(name, price, img) { 
    cart.push({ name, price, img }); 
    updateCartUI(); 
    validateForm(); 
}

function removeFromCart(index) { 
    cart.splice(index, 1); 
    updateCartUI(); 
    validateForm(); 
}

function updateCartUI() {
    const itemsDiv = document.getElementById("cart-items");
    const count = document.getElementById("cart-count");
    count.innerText = cart.length;

    if (cart.length === 0) {
        itemsDiv.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>El carrito está vacío</p>";
        document.getElementById("cart-total-value").innerText = "0.00";
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map((item, idx) => {
        total += item.price;
        // Si la imagen es 3D, usamos un icono de cubo, si no, la miniatura
        const thumb = item.img.includes("tripo3d.ai") 
            ? `<div style="width:40px; height:40px; background:#eee; border-radius:5px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-cube" style="color:#666;"></i></div>`
            : `<img src="${item.img}" style="width:40px; height:40px; object-fit:cover; border-radius:5px; border:1px solid #ddd;">`;

        return `
            <div class="cart-item-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #f0f0f0; padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:10px; flex:1;">
                    ${thumb}
                    <div style="font-size:0.85rem;">
                        <b style="display:block; line-height:1.2;">${item.name}</b>
                        <span style="color:var(--primary); font-weight:bold;">$${item.price.toFixed(2)}</span>
                    </div>
                </div>
                <button onclick="removeFromCart(${idx})" style="color:#ff4757; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:5px;">&times;</button>
            </div>`;
    }).join("");
    document.getElementById("cart-total-value").innerText = total.toFixed(2);
}

// VALIDACIÓN DEL BOTÓN
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

    // Habilita el botón solo si los 4 campos tienen texto Y hay productos en el carrito
    if (name && id && phone && addr && cart.length > 0) {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
}

function toggleCart() { document.getElementById("cart-panel").classList.toggle("active"); }

async function processOrder() {
    const name = document.getElementById('cust-name').value;
    const id = document.getElementById('cust-id').value;
    const phone = document.getElementById('cust-phone').value;
    const addr = document.getElementById('cust-address').value;
    const total = document.getElementById('cart-total-value').innerText;

    const pedidoData = {
        auth_token: AUTH_TOKEN,
        cliente: name, cedula: id, telefono: phone, direccion: addr,
        productos: cart.map(i => i.name).join(', '), total: total
    };

    // Envío a Sheets
    try {
        fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(pedidoData) });
    } catch (e) { console.error("Error en Sheets"); }

    // Formateo WhatsApp
    let msg = `Hola *el izquierdo c.a*, nuevo pedido:%0A👤 *Cliente:* ${name}%0A💳 *CI:* ${id}%0A📍 *Dir:* ${addr}%0A%0A*PRODUCTOS:*%0A`;
    cart.forEach((i, idx) => msg += `${idx + 1}. ${i.name} ($${i.price.toFixed(2)})%0A`);
    msg += `%0A💰 *TOTAL: $${total}*`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    // Limpieza total (Instrucción guardada)
    setTimeout(() => {
        cart = []; 
        updateCartUI();
        ['cust-name', 'cust-id', 'cust-phone', 'cust-address'].forEach(id => document.getElementById(id).value = "");
        validateForm(); 
        toggleCart();
    }, 1200);
}

document.getElementById("searchInput").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(p => p.nombre.toLowerCase().includes(term));
    currentPage = 1; updateDisplay();
});

document.addEventListener("DOMContentLoaded", init);