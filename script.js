/**
 * IT SOPORTE - SISTEMA INTEGRAL 2026
 * - Etiquetas dinámicas desde Sheets sobre imágenes.
 * - Descripción visible en Carrito y PDF.
 * - Gestión avanzada de cantidades (Sumar/Restar/Eliminar).
 * - Soporte bimonetario ($/Bs) en todos los niveles.
 */

// --- 0. CONFIGURACIÓN Y ESTILOS ---
const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const WHATSAPP_NUMBER = "584226382165";
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"];
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz2423FMBvTWgKcp5XQLj_CpFPS8VI0d9WjXJl3x8Q1BwG9Kp_8qn9Zl7wL6ZNOh2yWrQ/exec";

const style = document.createElement("style");
style.innerHTML = `
    @keyframes cart-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
    .cart-animate { animation: cart-pulse 0.4s ease-in-out; color: #25D366 !important; }
    #pagination-controls { display: flex; justify-content: center; align-items: center; gap: 5px; margin: 30px 0; font-family: sans-serif; }
    #pagination-controls button { padding: 8px 12px; border: 1px solid #ddd; background: #fff; border-radius: 6px; font-weight: 700; color: #004080; cursor: pointer; transition: 0.2s; min-width: 40px; }
    #pagination-controls button:hover:not(:disabled) { background: #f0f4f8; }
    #pagination-controls button.active { background: #004080; color: #fff; border-color: #004080; }
    #pagination-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
    #cart-panel { transition: transform 0.3s ease; z-index: 9999; }
    #cart-panel.active { transform: translateX(0); }
    
    /* Etiquetas de Producto */
    .product-tag { position: absolute; top: 10px; right: 10px; background: #ff3b30; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: bold; z-index: 5; text-transform: uppercase; }
    .img-container { position: relative; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; background: #f9f9f9; border-radius: 10px; }
    
    /* Textos y Controles */
    .product-desc { font-size: 0.7rem; color: #666; margin: 5px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 1.8rem; }
    .cart-item-desc { font-size: 0.65rem; color: #888; display: block; margin-bottom: 5px; font-style: italic; }
    .cart-controls { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
    .btn-qty { background: #004080; color: white; border: none; border-radius: 4px; width: 22px; height: 22px; cursor: pointer; font-weight: bold; }
    .btn-del { background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 0.7rem; font-weight: bold; }
`;
document.head.appendChild(style);

let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
const productsPerPage = 12;

// --- 1. INICIALIZACIÓN ---
async function init() {
    const loader = document.getElementById("loader");
    allProducts = [];
    for (const prov of PROVEEDORES) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
        try {
            const res = await fetch(URL);
            const csvText = await res.text();
            const rows = csvText.trim().split(/\r?\n/).slice(1);
            rows.forEach((row) => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 3) {
                    const nombre = cols[0].replace(/^"|"$/g, "").trim();
                    const precioUSD = parseFloat(cols[2].replace(/^"|"$/g, "").replace(/\./g, "").replace(",", ".").trim()) || 0;
                    const etiqueta = cols[7] ? cols[7].replace(/^"|"$/g, "").trim() : "";
                    
                    if (nombre) {
                        allProducts.push({
                            nombre,
                            desc: cols[1] ? cols[1].replace(/^"|"$/g, "").trim() : "Sin descripción",
                            precioBase: precioUSD,
                            // Suponemos una tasa o precio en Bs si existiera en otra columna, si no se calcula dinámico
                            precioBaseBs: cols[8] ? parseFloat(cols[8].replace(/\./g, "").replace(",", ".")) : precioUSD * 60, 
                            img: cols[3] ? cols[3].replace(/^"|"$/g, "").trim() : "https://via.placeholder.com/300x200",
                            prov: prov,
                            tag: etiqueta
                        });
                    }
                }
            });
        } catch (e) { console.error("Error en " + prov, e); }
    }
    if (loader) loader.style.display = "none";
    filteredProducts = [...allProducts];
    updateDisplay();
    setupEventListeners();
    validateForm();
}

// --- 2. GESTIÓN DEL CARRITO ---
function addToCart(name, desc, baseUsd, baseBs, prov) {
    const existing = cart.find(i => i.name === name);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ name, desc, baseUsd, baseBs, qty: 1, prov });
    }
    updateCartUI();
    validateForm();
    animateBadge();
}

function updateQty(name, delta) {
    const item = cart.find(i => i.name === name);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) deleteFromCart(name);
    }
    updateCartUI();
    validateForm();
}

function deleteFromCart(name) {
    cart = cart.filter(i => i.name !== name);
    updateCartUI();
    validateForm();
}

function animateBadge() {
    const badge = document.getElementById("cart-count");
    if (badge) {
        badge.classList.add("cart-animate");
        setTimeout(() => badge.classList.remove("cart-animate"), 400);
    }
}

function updateCartUI() {
    const itemsDiv = document.getElementById("cart-items");
    const totalUsdDisp = document.getElementById("cart-total-value");
    const totalBsDisp = document.getElementById("cart-total-bs-value");
    const cartCount = document.getElementById("cart-count");
    
    let sumUSD = 0, sumBS = 0, totalQty = 0;
    
    if (itemsDiv) {
        itemsDiv.innerHTML = cart.map(item => {
            const subtotal = item.qty * (item.baseUsd * 1.16);
            const subtotalBs = item.qty * (item.baseBs * 1.16);
            sumUSD += subtotal;
            sumBS += subtotalBs;
            totalQty += item.qty;

            return `
            <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:1;">
                        <b style="font-size:0.85rem; display:block;">${item.name}</b>
                        <small class="cart-item-desc">${item.desc.substring(0, 60)}...</small>
                    </div>
                    <b style="font-size:0.85rem; color:#004080;">$${subtotal.toFixed(2)}</b>
                </div>
                <div class="cart-controls">
                    <button class="btn-qty" onclick="updateQty('${item.name}', -1)">-</button>
                    <span style="font-weight:bold; font-size:0.9rem;">${item.qty}</span>
                    <button class="btn-qty" onclick="updateQty('${item.name}', 1)">+</button>
                    <button class="btn-del" style="margin-left:auto;" onclick="deleteFromCart('${item.name}')">Eliminar</button>
                </div>
            </div>`;
        }).join("");
    }
    
    if (totalUsdDisp) totalUsdDisp.innerText = sumUSD.toFixed(2);
    if (totalBsDisp) totalBsDisp.innerText = sumBS.toLocaleString("es-VE", { minimumFractionDigits: 2 });
    if (cartCount) cartCount.innerText = totalQty;
}

function toggleCart() {
    const panel = document.getElementById("cart-panel");
    if (panel) panel.classList.toggle("active");
}

// --- 3. PROCESAMIENTO (Sheets + WhatsApp + PDF) ---
async function processOrder() {
    const totalUsd = document.getElementById("cart-total-value")?.innerText || "0.00";
    const totalBs = document.getElementById("cart-total-bs-value")?.innerText || "0.00";
    
    const payload = {
        auth_token: "IT_SOPORTE_2026",
        cliente: document.getElementById("cust-name").value.trim(),
        cedula: document.getElementById("cust-id").value.trim(),
        telefono: document.getElementById("cust-phone").value.trim(),
        direccion: document.getElementById("cust-address").value.trim(),
        productos: cart.map(i => `${i.qty}x ${i.name}`).join(", "),
        total: totalUsd,
        totalBs: totalBs
    };

    fetch(WEB_APP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });

    try { generatePDF(payload); } catch (e) { console.error("Error PDF:", e); }

    let msg = `*NUEVO PEDIDO - IT SOPORTE*%0A%0A`;
    msg += `*Cliente:* ${payload.cliente}%0A*C.I:* ${payload.cedula}%0A%0A*PRODUCTOS:*%0A`;
    cart.forEach(i => msg += `- ${i.qty}x ${i.name}%0A`);
    msg += `%0A*TOTAL:* $${payload.total} (${payload.totalBs} Bs)`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    setTimeout(() => {
        cart = [];
        ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
        updateCartUI();
        validateForm();
        toggleCart();
    }, 2000);
}

function generatePDF(data) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18); doc.setTextColor(0, 64, 128);
    doc.text("IT SOPORTE - ORDEN DE COMPRA", 105, 20, { align: "center" });
    
    doc.setFontSize(10); doc.setTextColor(50);
    doc.text(`Cliente: ${data.cliente} | CI: ${data.cedula}`, 20, 40);
    doc.text(`Dir: ${data.direccion}`, 20, 46);
    doc.line(20, 50, 190, 50);
    
    let y = 60;
    doc.setFont(undefined, "bold");
    doc.text("Producto / Descripción", 20, y);
    doc.text("Cant.", 130, y);
    doc.text("Total ($)", 160, y);
    doc.text("Total (Bs)", 190, y, { align: "right" });
    
    doc.setFont(undefined, "normal");
    y += 8;
    cart.forEach(item => {
        const subUSD = item.qty * (item.baseUsd * 1.16);
        const subBS = item.qty * (item.baseBs * 1.16);
        
        doc.setFont(undefined, "bold");
        doc.text(item.name.substring(0, 40), 20, y);
        doc.setFont(undefined, "normal");
        doc.setFontSize(8);
        doc.text(item.desc.substring(0, 60), 20, y + 4);
        doc.setFontSize(10);
        
        doc.text(item.qty.toString(), 132, y);
        doc.text(`$${subUSD.toFixed(2)}`, 160, y);
        doc.text(`${subBS.toLocaleString("es-VE")}`, 190, y, { align: "right" });
        
        y += 12;
        if (y > 270) { doc.addPage(); y = 20; }
    });
    
    y += 5; doc.line(130, y, 190, y);
    y += 10; doc.setFont(undefined, "bold");
    doc.text("TOTAL USD:", 130, y); doc.text(`$${data.total}`, 190, y, { align: "right" });
    doc.text("TOTAL BS:", 130, y + 7); doc.text(`${data.totalBs} Bs`, 190, y + 7, { align: "right" });
    
    doc.save(`Pedido_ITSoporte_${data.cliente}.pdf`);
}

// --- 4. INTERFAZ ---
function updateDisplay() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const start = (currentPage - 1) * productsPerPage;
    const items = filteredProducts.slice(start, start + productsPerPage);
    
    grid.innerHTML = items.map((p) => {
        const nEsc = p.nombre.replace(/'/g, "\\'");
        const dEsc = p.desc.replace(/'/g, "\\'");
        const provEsc = p.prov.replace(/'/g, "\\'");
        return `
        <div class="product-card" style="display:flex; flex-direction:column; height:100%; border:1px solid #eee; border-radius:15px; padding:15px; background:#fff; position:relative; transition:0.3s;">
            <div class="img-container">
                ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ""}
                <img src="${p.img}" style="max-height:100%; max-width:100%; object-fit:contain;" onerror="this.src='https://via.placeholder.com/300x200'">
            </div>
            <h3 style="font-size:0.8rem; font-weight:800; margin:5px 0; color:#333;">${p.nombre}</h3>
            <p class="product-desc">${p.desc}</p>
            <div style="margin-top: auto; padding-top:10px;">
                <div style="color:#059669; font-weight:900; font-size:1.1rem;">$${p.precioBase.toFixed(2)}</div>
                <div style="color:#666; font-size:0.7rem;">${p.precioBaseBs.toLocaleString("es-VE")} Bs</div>
            </div>
            <button onclick="addToCart('${nEsc}', '${dEsc}', ${p.precioBase}, ${p.precioBaseBs}, '${provEsc}')" 
                    style="width:100%; background:#004080; color:#fff; border:none; padding:12px; border-radius:8px; margin-top:10px; cursor:pointer; font-weight:800; font-size:0.75rem;">
                Añadir al Carrito
            </button>
        </div>`;
    }).join("");
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination-controls");
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ""; return; }
    let html = `<button ${currentPage === 1 ? "disabled" : ""} onclick="changePage(${currentPage - 1})">Anterior</button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? "active" : ""}" onclick="changePage(${i})">${i}</button>`;
        }
    }
    html += `<button ${currentPage === totalPages ? "disabled" : ""} onclick="changePage(${currentPage + 1})">Siguiente</button>`;
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    updateDisplay();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateForm() {
    const name = document.getElementById("cust-name")?.value.trim();
    const id = document.getElementById("cust-id")?.value.trim();
    const phone = document.getElementById("cust-phone")?.value.trim();
    const address = document.getElementById("cust-address")?.value.trim();
    const btn = document.getElementById("btn-finalize");
    const isReady = cart.length > 0 && name && id && phone && address;
    if (btn) {
        btn.disabled = !isReady;
        btn.style.background = isReady ? "#25D366" : "#ccc";
        btn.onclick = isReady ? processOrder : null;
    }
}

function setupEventListeners() {
    const search = document.getElementById("searchInput");
    if (search) {
        search.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            filteredProducts = allProducts.filter((p) => p.nombre.toLowerCase().includes(term) || p.desc.toLowerCase().includes(term));
            currentPage = 1;
            updateDisplay();
        });
    }
    ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", validateForm);
    });
}

document.addEventListener("DOMContentLoaded", init);