#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Funzione per leggere file
function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

// Funzione per parsare CSV manualmente
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        rows.push(row);
    }

    return rows;
}

// Funzione per parsare la data dal formato DD-MM-YYYY (o DD/MM/YYYY o DD\MM\YYYY)
function parseDate(dateString) {
    const separators = ['-', '/', '\\'];
    let parts = null;

    for (const sep of separators) {
        if (dateString.includes(sep)) {
            parts = dateString.split(sep);
            break;
        }
    }

    if (!parts || parts.length !== 3) {
        return null;
    }

    const [day, month, year] = parts;
    return new Date(year, month - 1, day);
}

// Funzione per confrontare date (solo giorno, mese, anno)
function isSameOrAfterToday(menuDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);

    const date = parseDate(menuDate);
    if (!date) return false;

    date.setHours(0, 0, 0, 0);

    return date >= startDate;
}

// Funzione per formattare la data
function formatDate(dateString) {
    const [day, month, year] = dateString.split(/[-\/\\]/);
    const date = new Date(year, month - 1, day);

    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    const giorno = giorni[date.getDay()];
    const numeroGiorno = day;
    const mese = mesi[date.getMonth()];
    const anno = year;

    return `${giorno} ${numeroGiorno} ${mese} ${anno}`;
}

// Funzione per formattare il nome file (con suffisso _prezzi)
function formatFileName(dateString) {
    const [day, month, year] = dateString.split(/[-\/\\]/);
    const date = new Date(year, month - 1, day);

    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

    return `menu_${day}_${mesi[date.getMonth()]}_${year}_prezzi.png`;
}

// Funzione per creare lista HTML piatti
function createDishList(dishes) {
    if (!dishes || dishes.length === 0) return '';

    const items = dishes
        .filter(dish => dish && dish.trim() !== '')
        .map(dish => {
            const cleanDish = dish.replace(/^[►•\-*]\s*/, '').trim();
            return `<li class="dish-item"><span class="dish-text">${cleanDish}</span></li>`;
        })
        .join('\n                ');

    return `<ul class="dish-list">\n                ${items}\n            </ul>`;
}

// Funzione per generare CSS variables dal config
function generateCSSVariables(config) {
    return `
        :root {
            /* Logo */
            --logo-width: ${config.logo.width}px;
            --logo-height: ${config.logo.height}px;
            --logo-margin-bottom: ${config.spacing.logoMarginBottom};
            
            /* Menu */
            --menu-width: ${config.menu.width}px;
            --menu-height: ${config.menu.height}px;
            --menu-padding: ${config.menu.padding};
            --menu-border-radius: ${config.menu.borderRadius};
            
            /* Colors */
            --background: ${config.colors.background};
            --text-color: ${config.colors.text};
            --cta-bg: ${config.colors.cta_bg};
            --cta-text: ${config.colors.cta_text};
            --section-border: ${config.colors.section_border};
            --footer-border: ${config.colors.footer_border};
            
            /* Fonts */
            --main-font: ${config.fonts.main};
            
            /* Typography */
            --subtitle-font-size: ${config.typography.subtitle.fontSize};
            --subtitle-letter-spacing: ${config.typography.subtitle.letterSpacing};
            --subtitle-font-weight: ${config.typography.subtitle.fontWeight};
            --date-font-size: ${config.typography.date.fontSize};
            --date-font-weight: ${config.typography.date.fontWeight};
            --hours-font-size: ${config.typography.hours.fontSize};
            --hours-font-style: ${config.typography.hours.fontStyle};
            --section-title-font-size: ${config.typography.sectionTitle.fontSize};
            --section-title-font-weight: ${config.typography.sectionTitle.fontWeight};
            --section-title-letter-spacing: ${config.typography.sectionTitle.letterSpacing};
            --section-title-text-transform: ${config.typography.sectionTitle.textTransform};
            --dish-item-font-size: ${config.typography.dishItem.fontSize};
            --dish-item-line-height: ${config.typography.dishItem.lineHeight};
            --dish-item-font-weight: ${config.typography.dishItem.fontWeight};
            --price-font-size: ${config.typography.priceTag.fontSize};
            --price-font-weight: ${config.typography.priceTag.fontWeight};
            --cta-font-size: ${config.typography.cta.fontSize};
            --cta-font-weight: ${config.typography.cta.fontWeight};
            --cta-letter-spacing: ${config.typography.cta.letterSpacing};
            
            /* Spacing */
            --header-margin-bottom: ${config.spacing.headerMarginBottom};
            --date-margin: ${config.spacing.dateMargin};
            --hours-margin-bottom: ${config.spacing.hoursMarginBottom};
            --section-margin-bottom: ${config.spacing.sectionMarginBottom};
            --section-title-margin-bottom: ${config.spacing.sectionTitleMarginBottom};
            --dish-item-margin-bottom: ${config.spacing.dishItemMarginBottom};
            --footer-padding-top: ${config.spacing.footerPaddingTop};
        }
    `;
}

// Funzione per generare il riepilogo prezzi
function generatePriceSummary(prices) {
    const items = [
        `<span class="price-summary-item">Primo ${prices.primo}</span>`,
        `<span class="price-summary-item">Primo abb. ${prices.primo_abbondante}</span>`,
        `<span class="price-summary-item">Secondo ${prices.secondo}</span>`,
        `<span class="price-summary-item">P. Healthy ${prices.piatto_healthy}</span>`
    ];
    return items.join('\n                    ');
}

// Funzione principale
async function compileMenus() {
    console.log('🚀 Avvio compilazione menu giornalieri CON PREZZI...\n');

    // Leggi file
    const config = JSON.parse(readFile('config_template_giornaliero_prezzi.json'));
    const template = readFile('template_giornaliero_prezzi.html');
    const csvContent = readFile('menu.csv');
    const menuData = parseCSV(csvContent);

    // Crea cartella output se non esiste
    const outputDir = config.output?.directory
        ? path.resolve(__dirname, config.output.directory)
        : path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📋 Trovate ${menuData.length} righe nel CSV\n`);

    // Filtra le date se il filtro è abilitato
    let filteredData = menuData;
    const dateFilterEnabled = config.dateFilter?.enabled === true;

    if (dateFilterEnabled) {
        console.log('📅 Filtro date ABILITATO: elaboro solo date dalla data odierna in avanti\n');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredData = menuData.filter(row => {
            if (!isSameOrAfterToday(row.giorno)) return false;

            const date = parseDate(row.giorno);
            if (!date) return false;

            const day = date.getDay();
            return day !== 0 && day !== 6;
        });

        const skippedCount = menuData.length - filteredData.length;
        if (skippedCount > 0) {
            console.log(`⏭️  Saltate ${skippedCount} date passate\n`);
        }
    } else {
        console.log('📅 Filtro date DISABILITATO: elaboro tutte le date del CSV\n');
    }

    console.log(`📊 Processerò ${filteredData.length} menu con prezzi\n`);

    if (filteredData.length === 0) {
        console.log('⚠️  ATTENZIONE: Nessun menu da generare!');
        console.log('   Il CSV non contiene date dalla data odierna in avanti.\n');
        return;
    }

    // Avvia browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Processa ogni riga del CSV filtrato
    for (let i = 0; i < filteredData.length; i++) {
        const row = filteredData[i];
        const dateFormatted = formatDate(row.giorno);
        const fileName = formatFileName(row.giorno);

        console.log(`📅 Processando: ${dateFormatted}`);

        // Prepara i piatti
        const primi = [
            row.primo_piatto_1,
            row.primo_piatto_2,
            row.primo_piatto_3
        ];
        const secondi = [row.secondo, row.insalata_1, row.insalata_2];
        const piatto_healthy = [row.zuppa];

        // Sostituisci placeholder nel template
        let html = template;

        // Sostituisci CSS variables
        const oldCssVars = html.match(/:root\s*{[^}]+}/s)[0];
        html = html.replace(oldCssVars, generateCSSVariables(config));

        // Sostituisci testi
        html = html.replace(config.placeholders.hours, config.texts.hours);
        html = html.replace(config.placeholders.date, dateFormatted);
        html = html.replace(config.placeholders.cta, config.texts.cta);
        html = html.replace(config.placeholders.sections.primi, config.texts.sections.primi);
        html = html.replace(config.placeholders.sections.secondi, config.texts.sections.secondi);
        html = html.replace(config.placeholders.sections.piatti_healthy, config.texts.sections.piatti_healthy);

        // Sostituisci prezzi nei placeholder del template
        html = html.replace('[PRICE_PRIMO]', config.prices.primo);
        html = html.replace('[PRICE_SECONDO]', config.prices.secondo);
        html = html.replace('[PRICE_PIATTO_HEALTHY]', config.prices.piatto_healthy);

        // Sostituisci liste piatti
        html = html.replace('<!-- PRIMI_PIATTI_PLACEHOLDER -->', createDishList(primi));
        html = html.replace('<!-- SECONDI_PIATTI_PLACEHOLDER -->', createDishList(secondi));
        html = html.replace('<!-- PIATTO_HEALTHY_PLACEHOLDER -->', createDishList(piatto_healthy));

        // Sostituisci riepilogo prezzi
        html = html.replace('<!-- PRICE_SUMMARY_PLACEHOLDER -->', generatePriceSummary(config.prices));

        // Gestisci logo
        const logoPath = path.resolve(__dirname, config.logo.file);
        if (fs.existsSync(logoPath)) {
            const logoExt = path.extname(logoPath).toLowerCase();

            if (logoExt === '.svg') {
                const logoSvg = readFile(logoPath);
                html = html.replace(
                    /<div class="logo-placeholder">[\s\S]*?<\/div>/,
                    logoSvg
                );
            } else if (['.png', '.jpg', '.jpeg'].includes(logoExt)) {
                const logoBuffer = fs.readFileSync(logoPath);
                const logoBase64 = logoBuffer.toString('base64');
                const mimeType = logoExt === '.png' ? 'image/png' : 'image/jpeg';
                const logoImg = `<img src="data:${mimeType};base64,${logoBase64}" alt="Logo" style="width: var(--logo-width); height: var(--logo-height);">`;
                html = html.replace(
                    /<div class="logo-placeholder">[\s\S]*?<\/div>/,
                    `<div class="logo-placeholder">${logoImg}</div>`
                );
            }
        }

        // Genera PNG
        const page = await browser.newPage();
        await page.setViewport({
            width: config.menu.width,
            height: config.menu.height,
            deviceScaleFactor: config.export.deviceScaleFactor
        });

        await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

        const outputPath = path.join(outputDir, fileName);
        await page.screenshot({
            path: outputPath,
            fullPage: config.export.fullPage,
            omitBackground: config.export.omitBackground
        });

        await page.close();

        console.log(`✅ Creato: ${fileName}\n`);
    }

    await browser.close();

    console.log('🎉 Compilazione menu con prezzi completata!');
    console.log(`📁 File salvati in: ${outputDir}`);

    if (dateFilterEnabled && filteredData.length < menuData.length) {
        console.log(`\n📌 Riepilogo: Generati ${filteredData.length} menu su ${menuData.length} totali nel CSV`);
    }
}

// Esegui lo script
compileMenus().catch(error => {
    console.error('❌ Errore durante la compilazione:', error);
    process.exit(1);
});
