// =====================================================================
// 🧠 БЭКЕНД: АЛГОРИТМ ОПТИМИЗАЦИИ (МОНТЕ-КАРЛО)
// =====================================================================
function generateAllSolutions(requiredParts, stockPieces, defaultLength, bladeThickness, tolerance, iterations = 4000) {
    let flatParts = [];
    for (let [length, count] of requiredParts) {
        for (let i = 0; i < count; i++) flatParts.push(length);
    }
    if (flatParts.length === 0) return [];
    for (let p of flatParts) {
        if (p > defaultLength + tolerance) return [];
    }

    let validSolutions = [];

    for (let iter = 0; iter < iterations; iter++) {
        let currentParts = [...flatParts];
        
        for (let i = currentParts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentParts[i], currentParts[j]] = [currentParts[j], currentParts[i]];
        }

        let availableBars = [];
        if (stockPieces) {
            for (let [length, count] of stockPieces) {
                for (let c = 0; c < count; c++) {
                    availableBars.push({ initial_len: length, is_custom: true, cuts: [] });
                }
            }
        }
        availableBars.sort((a, b) => a.initial_len - b.initial_len);

        let resultBars = [];

        for (let bar of availableBars) {
            if (currentParts.length === 0) break;
            let i = 0;
            while (i < currentParts.length) {
                let part = currentParts[i];
                let used = bar.cuts.reduce((a, b) => a + b, 0) + (bar.cuts.length * bladeThickness);
                if (bar.initial_len - used + tolerance >= part) {
                    bar.cuts.push(part);
                    currentParts.splice(i, 1);
                } else {
                    i++;
                }
            }
            if (bar.cuts.length > 0) resultBars.push(bar);
        }

        while (currentParts.length > 0) {
            let newBar = { initial_len: defaultLength, is_custom: false, cuts: [] };
            let i = 0;
            while (i < currentParts.length) {
                let part = currentParts[i];
                let used = newBar.cuts.reduce((a, b) => a + b, 0) + (newBar.cuts.length * bladeThickness);
                if (defaultLength - used + tolerance >= part) {
                    newBar.cuts.push(part);
                    currentParts.splice(i, 1);
                } else {
                    i++;
                }
            }
            resultBars.push(newBar);
        }
        validSolutions.push(resultBars);
    }

    let minBars = Math.min(...validSolutions.map(sol => sol.length));
    let optimalSolutions = validSolutions.filter(sol => sol.length === minBars);

    let uniqueSolutions = [];
    let seenFingerprints = new Set();

    for (let sol of optimalSolutions) {
        let fingerprint = sol.map(bar => [...bar.cuts].sort((a, b) => a - b).join(',')).sort().join('|');
        if (!seenFingerprints.has(fingerprint)) {
            seenFingerprints.add(fingerprint);
            uniqueSolutions.push(sol);
        }
    }
    return uniqueSolutions;
}

function sortSolutions(solutions, mode, bladeThickness) {
    if (solutions.length === 0) return [];

    let scoredSolutions = solutions.map(sol => {
        let wastes = sol.map(bar => {
            let used = bar.cuts.reduce((a, b) => a + b, 0) + (Math.max(0, bar.cuts.length - 1) * bladeThickness);
            return bar.initial_len - used;
        });

        let score = 0;
        if (mode === 0) {
            score = Math.max(...wastes);
        } else {
            let cleanWastes = wastes.filter(w => w > 50);
            if (cleanWastes.length <= 1) score = 0;
            else score = -(Math.max(...cleanWastes) - Math.min(...cleanWastes));
        }
        return { sol, score };
    });

    scoredSolutions.sort((a, b) => b.score - a.score);
    return scoredSolutions.slice(0, 3).map(item => item.sol);
}

// =====================================================================
// 🎨 ФРОНТЕНД: УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И CANVAS
// =====================================================================
let topSolutions = [];
let currentIdx = 0;

function createRowHTML(containerId, defaultLen, defaultCnt) {
    const container = document.getElementById(containerId);
    const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
    
    const row = document.createElement('div');
    row.className = 'data-row';
    row.id = rowId;
    row.innerHTML = `
        <input type="number" class="input-len" placeholder="Длина" value="${defaultLen}">
        <input type="number" class="input-cnt" placeholder="Кол-во" value="${defaultCnt}">
        <button class="btn btn-del" onclick="document.getElementById('${rowId}').remove()">✕</button>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

function addReqRow() { createRowHTML('req_rows_container', '', ''); }
function addStockRow() { createRowHTML('stock_rows_container', '', ''); }

function parseRows(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.getElementsByClassName('data-row');
    let data = [];
    for (let row of rows) {
        let len = parseInt(row.querySelector('.input-len').value) || 0;
        let cntField = row.querySelector('.input-cnt').value;
        let cnt = cntField === '' ? 1 : parseInt(cntField) || 1;
        
        if (len > 0 && cnt > 0) data.push([len, cnt]);
    }
    return data;
}

function processCalculation() {
    const defaultLength = parseInt(document.getElementById('cfg_stock_len').value) || 6000;
    const bladeThickness = parseInt(document.getElementById('cfg_blade_thick').value) || 0;
    const tolerance = parseInt(document.getElementById('cfg_tolerance').value) || 0;
    const mode = parseInt(document.getElementById('cfg_mode').value);

    const required = parseRows('req_rows_container');
    const stock = parseRows('stock_rows_container');

    if (required.length === 0) return;

    let allSols = generateAllSolutions(required, stock, defaultLength, bladeThickness, tolerance);
    
    const outputSide = document.getElementById('output_side');
    outputSide.innerHTML = ''; 

    if (allSols.length === 0) {
        outputSide.innerHTML = `<div class="error-msg">⚠️ Детали не помещаются в базовый хлыст!</div>`;
        return;
    }

    topSolutions = sortSolutions(allSols, mode, bladeThickness);
    renderTabsAndLayout();
    switchVariant(0);
}

function renderTabsAndLayout() {
    const outputSide = document.getElementById('output_side');
    
    const navFrame = document.createElement('div');
    navFrame.className = 'nav-frame';
    
    const title = document.createElement('div');
    title.id = 'active_variant_title';
    title.className = 'stats-lbl';
    title.innerText = ''; // Заголовок пустой по ТЗ
    navFrame.appendChild(title);

    const tabs = document.createElement('div');
    tabs.className = 'variant-tabs';
    
    for (let i = 0; i < topSolutions.length; i++) {
        let btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.id = `tab_btn_${i}`;
        btn.innerText = `План ${i+1}`;
        btn.onclick = () => switchVariant(i);
        tabs.appendChild(btn);
    }
    
    navFrame.appendChild(tabs);
    outputSide.appendChild(navFrame);

    const cardsContainer = document.createElement('div');
    cardsContainer.id = 'cards_container';
    outputSide.appendChild(cardsContainer);
}

function switchVariant(idx) {
    if (idx >= topSolutions.length) return;
    currentIdx = idx;

    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    const container = document.getElementById('cards_container');
    container.innerHTML = '';

    const currentSol = topSolutions[idx];
    const defaultLength = parseInt(document.getElementById('cfg_stock_len').value) || 6000;
    const bladeThickness = parseInt(document.getElementById('cfg_blade_thick').value) || 0;

    currentSol.forEach((bar, barIdx) => {
        bar.cuts.sort((a, b) => b - a);

        let card = document.createElement('div');
        card.className = 'pipe-card';

        let label = document.createElement('div');
        label.className = 'pipe-label';
        label.style.color = bar.is_custom ? '#a9d8b9' : '#a9d8ff';
        label.innerText = `${bar.initial_len}`;
        card.appendChild(label);

        let canvas = document.createElement('canvas');
        card.appendChild(canvas);
        container.appendChild(card);

        drawPipeCanvas(canvas, bar, defaultLength, bladeThickness);
    });
}

function drawPipeCanvas(canvas, bar, defaultLength, bladeThickness) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 65 * 2;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const padX = 10;
    const padY = 20;
    const renderW = rect.width - (padX * 2);
    const renderH = 24;
    const scale = renderW / defaultLength;

    const pipeW = bar.initial_len * scale;

    // Основа хлыста — графит
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#444444';
    ctx.fillStyle = '#202020';
    ctx.fillRect(padX, padY, pipeW, renderH);
    ctx.strokeRect(padX, padY, pipeW, renderH);

    // Детали — спокойные оттенки голубого
    const colors = ['#426d91', '#314f68'];

    let currentX = padX;
    let accumulatedLen = 0;

    bar.cuts.forEach((part, idx) => {
        let partW = part * scale;
        accumulatedLen += part;

        if (idx > 0) {
            accumulatedLen += bladeThickness;

            // Линия пропила
            ctx.beginPath();
            ctx.strokeStyle = '#151515';
            ctx.moveTo(currentX, padY);
            ctx.lineTo(currentX, padY + renderH);
            ctx.stroke();
        }

        let isOver = accumulatedLen > bar.initial_len;

        // Ошибка размещения — мягкий лососевый;
        // нормальная деталь — голубая палитра
        ctx.fillStyle = isOver ? '#b87568' : colors[idx % 2];
        ctx.fillRect(currentX, padY, partW, renderH);

        // Подписи сегментов
        if (partW > 25) {
            ctx.fillStyle = '#f5f5f5';
            ctx.font = 'bold 10px Consolas';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(part, currentX + (partW / 2), padY + (renderH / 2));
        } else {
            ctx.fillStyle = '#cccccc';
            ctx.font = '9px Consolas';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(part, currentX + (partW / 2), padY - 4);
        }

        currentX += partW + (bladeThickness * scale);
    });

    let usedSpace = bar.cuts.reduce((a, b) => a + b, 0)
        + (Math.max(0, bar.cuts.length - 1) * bladeThickness);

    let scrap = bar.initial_len - usedSpace;

    if (scrap > 0) {
        let scrapW = scrap * scale;
        let scrapX = padX + (usedSpace * scale);

        // Остаток — приглушённый зелёный
        ctx.fillStyle = '#426d5a';
        ctx.fillRect(scrapX, padY, scrapW, renderH);

        ctx.fillStyle = '#a9d8b9';
        ctx.font = 'bold 11px Consolas';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(scrap, scrapX, padY + renderH + 6);

    } else if (scrap < 0) {
        // Отрицательный остаток — мягкое предупреждение
        ctx.fillStyle = '#ffb5a8';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`! ${Math.abs(scrap)}`, padX, padY + renderH + 6);
    }
}

// По одной стартовой пустой строке при инициализации
window.onload = function() {
    addReqRow();
    addStockRow();
}
