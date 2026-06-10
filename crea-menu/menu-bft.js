const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Carica la configurazione SPECIFICA per BFT (path relativo a questo file)
const configPath = path.join(__dirname, 'config-menu-bft.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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
    let headers = lines[0].split(separator).map(h => h.trim().replace('\r', ''));

    // --- se non ci sono intestazioni ma la prima cella è una data, creiamo
    // intestazioni “di default” in base al numero di colonne --
    const datePattern = /^\d{1,2}[-\/\\]\d{1,2}[-\/\\]\d{4}$/;
    if (headers.length && datePattern.test(headers[0].trim())) {
        const defaultHeaders = [
            'giorno',
            'primo_piatto_1',
            'primo_piatto_2',
            'primo_piatto_3', // eventualmente presente
            'secondo',
            'zuppa',
            'insalata_1',
            'insalata_2'
        ];
        headers = defaultHeaders.slice(0, headers.length);
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim().replace('\r', '') : '';
        });

        if (row.giorno) {
            const parts = row.giorno.split(/[-\/\\]/);
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

// Logic: Group data by Week (Monday start)
function groupWeeks(menuData) {
    const weeks = {};

    menuData.forEach(day => {
        if (!day.parsedDate) return;

        // Find Monday of this week
        const date = new Date(day.parsedDate);
        const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
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

// Generate Row HTML with Specific BFT Logic (only 2 primi)
function generateDayRow(dayData) {
    const dateInfo = formatDate(dayData.parsedDate);

    // Primi - ONLY 1 and 2
    let primiHTML = '';
    // Loop only 1 to 2
    for (let i = 1; i <= 2; i++) {
        const piatto = dayData[`primo_piatto_${i}`];
        if (piatto && piatto.trim()) {
            primiHTML += `<li>${piatto}</li>`;
        }
    }

    // Secondi + Insalate
    let secondiHTML = '';
    if (dayData.secondo && dayData.secondo.trim()) {
        secondiHTML += `<li>${dayData.secondo}</li>`;
    }
    for (let i = 1; i <= 2; i++) {
        const insalata = dayData[`insalata_${i}`];
        if (insalata && insalata.trim()) {
            secondiHTML += `<li>${insalata}</li>`;
        }
    }

    // Piatto Healthy (dalla colonna zuppa del CSV)
    let piattoHealthyHTML = '';
    if (dayData.zuppa && dayData.zuppa.trim()) {
        piattoHealthyHTML += `<li>${dayData.zuppa}</li>`;
    }

    return `
    <div class="day-row">
        <div class="day-info">
            <div class="day-name">${dateInfo.dayName}</div>
            <div class="day-date">${dateInfo.day} ${dateInfo.month}</div>
        </div>
        <div class="course-col"><ul>${primiHTML}</ul></div>
        <div class="course-col"><ul>${secondiHTML}</ul></div>
        <div class="course-col"><ul>${piattoHealthyHTML}</ul></div>
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

async function generateWeeklyMenu() {
    console.log('🚀 Avvio generazione PDF Menu BFT (Multi-settimana)...');

    // Crea cartella output se non esiste
    const outputDir = path.resolve(__dirname, config.output.directory);
    ensureDirectoryExists(outputDir);
    const menuData = parseCSV('menu.csv');

    // 1. Group by Weeks
    const weeksMap = groupWeeks(menuData);

    // 2. Filter Future Weeks (include the day before today as start)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);

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

        // Calculate Friday of this week (End of working week)
        const weekFriday = new Date(weekDate);
        weekFriday.setDate(weekDate.getDate() + 4);
        weekFriday.setHours(23, 59, 59, 999); // End of day

        // 1. Skip if the working week is fully in the past (compare against startDate)
        if (weekFriday < startDate) continue;

        let weekData = weeksMap[weekKey];

        // 2. FILTER: Remove Saturday (6) and Sunday (0)
        weekData = weekData.filter(d => {
            const day = d.parsedDate.getDay();
            return day !== 0 && day !== 6;
        });

        if (weekData.length === 0) continue;

        // 3. Skip if NO CONTENT (empty menu lines)
        // Check if at least one day has a "primo_piatto_1"
        const hasContent = weekData.some(d => d.primo_piatto_1 && d.primo_piatto_1.trim() !== '');

        if (!hasContent) {
            console.log(`⚠️ Settimana ${weekKey} ignorata: Nessun contenuto trovato.`);
            continue;
        }

        // Sort days
        weekData.sort((a, b) => a.parsedDate - b.parsedDate);

        // Generate PDF for this week
        await generatePdfForWeek(browser, weekData, weekKey);
        generatedCount++;
    }

    await browser.close();

    if (generatedCount === 0) {
        console.warn("⚠️ Nessuna settimana futura trovata nel CSV. (Verifica che le date nel CSV siano >= della data odierna)");
    }

    // Cleanup Debug HTML
    const debugPath = path.join(config.output.directory, 'debug_bft_menu.html');
    if (fs.existsSync(debugPath)) {
        try {
            fs.unlinkSync(debugPath);
            console.log(`🧹 Debug HTML eliminato: ${debugPath}`);
        } catch (e) {
            console.error(`Errore eliminazione debug HTML: ${e.message}`);
        }
    }
}

async function generatePdfForWeek(browser, weekData, weekKey) {
    // Calculate Date Range strictly from Monday to Friday based on the Week Grouping
    const mondayDate = new Date(weekKey);
    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(mondayDate.getDate() + 4);

    const dateRangeStr = `Dal ${formatDate(mondayDate).full} Al ${formatDate(fridayDate).full}`;

    console.log(`📅 Generazione settimana: ${dateRangeStr}`);

    // Build HTML
    let rowsHTML = '';

    // Create a map of existing days to ensure we display empty rows if needed?
    // User request didn't strictly say "show empty days", usually we just show what's available.
    // But "le settimane da considerare sono dal lunedi al venerdi" implies the *scope*.
    // We will list the days we have data for.

    weekData.forEach(day => {
        rowsHTML += generateDayRow(day);
    });

    let template = fs.readFileSync('template_menu_bft.html', 'utf8');

    // --- Inject Configuration Values (esporta come CSS variables in :root) ---
    const cssVars = `
    :root {
        --background: ${config.colors.background};
        --text-color: ${config.colors.text};
        --cta-bg: ${config.colors.cta_bg};
        --cta-text: ${config.colors.cta_text};
        --section-border: ${config.colors.section_border || 'rgba(0,0,0,0.08)'};
        --footer-border: ${config.colors.footer_border || 'rgba(0,0,0,0.08)'};
        --main-font: ${config.colors.font || 'Arial, sans-serif'};
    }
    `;
    template = template.replace('/*__CSS_VARIABLES__*/', cssVars);

    const brandName = config.logo.fallbackText || 'BFT Menu';
    template = template.replace(/\{\{BRAND_NAME\}\}/g, brandName);

    const weekLabel = config.texts.weekTitle || 'Menù Settimanale';
    template = template.replace(/\{\{WEEK_LABEL\}\}/g, weekLabel);

    template = template.replace(/\{\{DATE_RANGE\}\}/g, dateRangeStr);

    template = template.replace('{{COL_1}}', 'Giorno');
    template = template.replace('{{COL_2}}', config.texts.sections.primi || 'Primi');
    template = template.replace('{{COL_3}}', config.texts.sections.secondi || 'Secondi');
    template = template.replace('{{COL_4}}', config.texts.sections.piatti_healthy || 'Piatti Healthy');

    template = template.replace('{{DAYS_CONTENT}}', rowsHTML);

    template = template.replace('{{ALWAYS_AVAILABLE_TITLE}}', config.texts.alwaysAvailableTitle || 'Piatti sempre disponibili');
    let alwaysAvailHTML = '';
    if (config.alwaysAvailable && Array.isArray(config.alwaysAvailable)) {
        config.alwaysAvailable.forEach(item => {
            alwaysAvailHTML += `<li>${item}</li>`;
        });
    }
    template = template.replace('{{ALWAYS_AVAILABLE_ITEMS}}', alwaysAvailHTML);

    const hoursText = (config.serviceCard.hours || '').replace(/\n/g, '<br>');
    template = template.replace('{{HOURS_TEXT}}', hoursText);

    const pricesTitle = config.serviceCard.title || 'Listino';
    template = template.replace('{{PRICES_TITLE}}', pricesTitle);

    let priceListHTML = '';
    if (config.serviceCard.prices && Array.isArray(config.serviceCard.prices)) {
        config.serviceCard.prices.forEach(priceLine => {
            priceListHTML += `<div class="price-item">${priceLine}</div>`;
        });
    }
    template = template.replace('{{PRICE_LIST}}', priceListHTML);

    const logoURI = toDataURI(config.logo.file);
    template = template.replace('{{LOGO_SRC}}', logoURI);

    // Save temporary debug HTML (will be deleted later, but needed for Puppeteer)
    const debugPath = path.join(config.output.directory, 'debug_bft_menu.html');
    fs.writeFileSync(debugPath, template);

    const page = await browser.newPage();
    await page.setContent(template, { waitUntil: 'load', timeout: 60000 });

    // PDF path absolute
    const outputDir = path.resolve(__dirname, config.output.directory);
    const fNameDate = `${String(mondayDate.getDate()).padStart(2, '0')}-${String(mondayDate.getMonth() + 1).padStart(2, '0')}-${mondayDate.getFullYear()}`;
    const pdfFilename = `menu_bft_dal_${fNameDate}.pdf`;
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
