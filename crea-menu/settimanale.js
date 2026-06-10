const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Carica la configurazione
const config = JSON.parse(fs.readFileSync('config-settimanale.json', 'utf8'));

// Utility: Ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Directory creata: ${dirPath}`);
    }
}

// Utility: Parse CSV
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    const separator = lines[0].includes('\t') ? '\t' : ',';
    // Remove potential carriage returns
    const headers = lines[0].split(separator).map(h => h.trim().replace('\r', ''));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim().replace('\r', '') : '';
        });

        // Add parsed Date object for easier sorting/filtering
        if (row.giorno) {
            const parts = row.giorno.split(/[-\/\\]/);
            // Assuming DD-MM-YYYY
            row.parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }

        data.push(row);
    }

    return data;
}

// Utility: Format Date
function formatDate(dateObj) {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    return {
        dayName: giorni[dateObj.getDay()],
        day: dateObj.getDate(),
        month: mesi[dateObj.getMonth()],
        year: dateObj.getFullYear(),
        full: `${dateObj.getDate()} ${mesi[dateObj.getMonth()]}`
    };
}

// Generate Row HTML (Premium Layout)
function generateDayRow(dayData) {
    const dateInfo = formatDate(dayData.parsedDate);

    // Primi
    let primiHTML = '';
    for (let i = 1; i <= 3; i++) {
        const piatto = dayData[`primo_piatto_${i}`];
        if (piatto && piatto.trim()) {
            primiHTML += `<li>${piatto}</li>`;
        }
    }

    // Secondi
    let secondiHTML = '';
    if (dayData.secondo && dayData.secondo.trim()) {
        secondiHTML += `<li>${dayData.secondo}</li>`;
    }

    // Contorni (Zuppe + Insalate)
    let contorniHTML = '';

    if (dayData.zuppa && dayData.zuppa.trim()) {
        contorniHTML += `<li>${dayData.zuppa} (Zuppa)</li>`;
    }

    for (let i = 1; i <= 2; i++) {
        const insalata = dayData[`insalata_${i}`];
        if (insalata && insalata.trim()) {
            contorniHTML += `<li>${insalata}</li>`;
        }
    }

    return `
    <div class="day-row">
        <div class="day-info">
            <div class="day-name">${dateInfo.dayName}</div>
            <div class="day-date">${dateInfo.day} ${dateInfo.month}</div>
        </div>
        <div class="course-col"><ul>${primiHTML}</ul></div>
        <div class="course-col"><ul>${secondiHTML}</ul></div>
        <div class="course-col"><ul>${contorniHTML}</ul></div>
    </div>
    `;
}

// Image/SVG to Base64
function toDataURI(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return '';
        }
        const ext = path.extname(filePath).toLowerCase();
        const buffer = fs.readFileSync(filePath);

        let mimeType = 'application/octet-stream';
        if (ext === '.svg') mimeType = 'image/svg+xml';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
    } catch (e) {
        console.error("Asset load fail:", e);
        return '';
    }
}

// Logic: Group data by Week (Monday start)
function groupWeeks(menuData) {
    const weeks = {};

    menuData.forEach(day => {
        if (!day.parsedDate) return;

        // Find Monday of this week
        const date = new Date(day.parsedDate);
        const dayOfWeek = date.getDay(); // 0=Sun
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        // Use local time for string key to avoid UTC shift
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(monday.getDate()).padStart(2, '0');
        const mondayStr = `${year}-${month}-${dayOfMonth}`;

        if (!weeks[mondayStr]) {
            weeks[mondayStr] = [];
        }
        weeks[mondayStr].push(day);
    });

    return weeks;
}

async function generateWeeklyMenu() {
    console.log('🚀 Avvio generazione PDF Menu Premium (Multi-settimana)...');

    // Crea cartella output se non esiste
    const outputDir = path.resolve(__dirname, config.output.directory);
    ensureDirectoryExists(outputDir);
    const menuData = parseCSV('menu.csv');

    // 1. Group by Weeks
    const weeksMap = groupWeeks(menuData);

    // 2. Filter Future Weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedWeekKeys = Object.keys(weeksMap).sort();

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });

    let generatedCount = 0;

    for (const weekKey of sortedWeekKeys) {
        // Parse weekKey (YYYY-MM-DD) as Local Date
        const [wY, wM, wD] = weekKey.split('-').map(Number);
        const weekDate = new Date(wY, wM - 1, wD); // Local Midnight

        // Calculate Friday of this week
        const weekFriday = new Date(weekDate);
        weekFriday.setDate(weekDate.getDate() + 4);
        weekFriday.setHours(23, 59, 59, 999);

        // Skip if the working week is fully in the past
        if (weekFriday < today) continue;

        let weekData = weeksMap[weekKey];

        // FILTER: Remove Saturday (6) and Sunday (0)
        weekData = weekData.filter(d => {
            const day = d.parsedDate.getDay();
            return day !== 0 && day !== 6;
        });

        if (weekData.length === 0) continue;

        // Skip if NO CONTENT (empty menu lines)
        const hasContent = weekData.some(d => d.primo_piatto_1 && d.primo_piatto_1.trim() !== '');
        if (!hasContent) continue;

        // Sort days
        weekData.sort((a, b) => a.parsedDate - b.parsedDate);

        // Generate PDF for this week
        await generatePdfForWeek(browser, weekData, weekDate);
        generatedCount++;
    }

    await browser.close();

    if (generatedCount === 0) {
        console.warn("⚠️ Nessuna settimana futura trovata nel CSV.");
    }

    // Cleanup Debug HTML
    const debugPath = path.join(config.output.directory, 'debug_premium_menu.html');
    if (fs.existsSync(debugPath)) {
        try {
            fs.unlinkSync(debugPath);
        } catch (e) { }
    }
}

async function generatePdfForWeek(browser, weekData, mondayDate) {
    const startDate = weekData[0].parsedDate;
    const endDate = weekData[weekData.length - 1].parsedDate;

    // Title uses semantic week range base on mondayDate for consistency
    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(mondayDate.getDate() + 4);
    const dateRangeStr = `Dal ${formatDate(mondayDate).full} Al ${formatDate(fridayDate).full}`;

    console.log(`📅 Generazione settimana: ${dateRangeStr}`);

    // Build HTML
    let rowsHTML = '';
    weekData.forEach(day => {
        rowsHTML += generateDayRow(day);
    });

    let template = fs.readFileSync('template_settimanale.html', 'utf8');

    // --- Inject Configuration Values ---
    const cssVars = `
        --background: ${config.colors.background};
        --text-color: ${config.colors.text};
        --cta-bg: ${config.colors.cta_bg};
        --cta-text: ${config.colors.cta_text};
        --main-font: ${config.colors.font || "Arial, sans-serif"};
    `;
    template = template.replace('__CSS_VARIABLES__', cssVars);

    const brandName = config.logo.fallbackText || 'MeridianaCafè';
    template = template.replace(/\{\{BRAND_NAME\}\}/g, brandName);

    const weekLabel = config.texts.weekTitle || 'Menù Settimanale';
    template = template.replace(/\{\{WEEK_LABEL\}\}/g, weekLabel);

    template = template.replace(/\{\{DATE_RANGE\}\}/g, dateRangeStr);

    template = template.replace('{{COL_1}}', 'Giorno');
    template = template.replace('{{COL_2}}', config.texts.sections.primi || 'Primi');
    template = template.replace('{{COL_3}}', config.texts.sections.secondi || 'Secondi');
    template = template.replace('{{COL_4}}', config.texts.sections.contorni || 'Contorni');

    template = template.replace('{{DAYS_CONTENT}}', rowsHTML);

    const hoursTitle = config.serviceCard.title || 'Orari Cucina';
    template = template.replace('{{HOURS_TITLE}}', hoursTitle);

    const hoursText = (config.serviceCard.hours || '').replace(/\n/g, '<br>');
    template = template.replace('{{HOURS_TEXT}}', hoursText);

    const pricesTitle = config.serviceCard.pricesLabel || 'Listino';
    template = template.replace('{{PRICES_TITLE}}', pricesTitle);

    const prices = config.serviceCard.prices;
    let priceListHTML = '';
    if (prices.primi) priceListHTML += `<div class="price-item">Primi <span>${prices.primi}</span></div>`;
    if (prices.secondi) priceListHTML += `<div class="price-item">Secondi <span>${prices.secondi}</span></div>`;
    if (prices.insalate) priceListHTML += `<div class="price-item">Contorni <span>${prices.insalate}</span></div>`;

    template = template.replace('{{PRICE_LIST}}', priceListHTML);

    template = template.replace('{{CTA_BUTTON}}', 'PRENOTA');
    template = template.replace('{{CTA_SUB}}', 'su WhatsApp');

    const qrCodeURI = toDataURI(config.serviceCard.whatsapp.qrCode);
    template = template.replace('{{QR_CODE}}', qrCodeURI);

    const logoURI = toDataURI(config.logo.file);
    template = template.replace('{{LOGO_SRC}}', logoURI);

    const debugPath = path.join(config.output.directory, 'debug_premium_menu.html');
    fs.writeFileSync(debugPath, template);

    const page = await browser.newPage();
    await page.setContent(template, { waitUntil: 'load', timeout: 60000 });

    // PDF path absolute
    const outputDir = path.resolve(__dirname, config.output.directory);
    const fNameDate = `${String(mondayDate.getDate()).padStart(2, '0')}-${String(mondayDate.getMonth() + 1).padStart(2, '0')}-${mondayDate.getFullYear()}`;
    const pdfFilename = `settimanale_dal_${fNameDate}.pdf`;
    const pdfPath = path.join(outputDir, pdfFilename);

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true
    });

    await page.close();
    console.log(`✅ PDF Generato: ${pdfPath}`);
}

generateWeeklyMenu();
