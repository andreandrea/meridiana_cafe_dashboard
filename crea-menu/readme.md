# MeridianaCafè - Generatore Menu Automatico

Sistema automatico per la generazione di menu giornalieri e settimanali (Premium e Business BFT) per MeridianaCafè, che converte dati CSV in immagini professionali e PDF pronti per la stampa o la pubblicazione.

## 📋 Panoramica

Questo progetto automatizza la creazione di menu visivi per MeridianaCafè utilizzando:
- **Dati CSV** unico per tutti i formati
- **Template HTML/CSS** con design Premium e Business (Glassmorphism)
- **Configurazione JSON** centralizzata per ogni script
- **Puppeteer** per la generazione di PDF (A4) e PNG ad alta risoluzione
- **Logica Multi-settimana**: Genera automaticamente tutte le settimane future presenti nel CSV

## 🚀 Caratteristiche

- ✅ **Menu Giornalieri (PNG)**: Immagini ottimizzate per i social.
- ✅ **Menu Settimanali (PDF A4)**: Due varianti professionali:
  - **Premium**: Layout elegante per MeridianaCafè.
  - **Business (BFT)**: Design moderno con effetti blur e moodboard blu/oro.
- ✅ **Filtro Intelligente Future**:
  - Salta i giorni passati.
  - Salta i weekend (Sabato/Domenica).
  - **Salta le settimane vuote** (non genera file se non ci sono piatti inseriti).
- ✅ **Generazione Multipla**: Gestisce infiniti blocchi settimanali con un solo comando.
- ✅ **Configurazione JSON Separata**: Personalizzazione di colori, loghi e prezzi per ogni brand.
- ✅ **Percorsi Assoluti**: Massima stabilità durante l'esecuzione automatizzata via .bat.

## 📁 Struttura File

```
crea-menu/
├── giornaliero.js               # Script per menu giornalieri (PNG)
├── settimanale.js               # Script per menu settimanali Premium (PDF)
├── menu-bft.js                  # Script per menu settimanali Business/BFT (PDF)
├── config-giornaliero.json      # Configurazione Giornaliero
├── config-settimanale.json      # Configurazione Premium
├── config-menu-bft.json         # Configurazione Business/BFT
├── template_giornaliero.html    # Template Daily
├── template_settimanale.html    # Template Weekly Premium
├── template_menu_bft.html       # Template Weekly Business
├── menu.csv                     # Database unico dei piatti
├── run-menu.bat                 # Automazione totale Windows
├── asset/                       # Loghi e Codici QR
└── output/                      # 📁 PDF e PNG generati
```

## 🛠️ Installazione

1. **Clona o scarica il progetto**
2. **Installa le dipendenze:**
   ```bash
   npm install
   ```

## ⚙️ Configurazione

Ogni script ha il suo file `.json`. Ad esempio, per il menu **BFT**, puoi cambiare:
- `colors`: Palette colori blu/oro e gradienti.
- `serviceCard`: Orari e listino prezzi specifico per il business.
- `alwaysAvailable`: Lista dei piatti "sempre disponibili" a piè di pagina.

### Logica Prossime Settimane
Tutti gli script settimanali ora seguono questa regola:
1. Raggruppano i giorni in blocchi **Lunedì-Venerdì**.
2. Controllano se la settimana è già passata (basandosi sul Venerdì).
3. **Verificano la presenza di dati**: Se la colonna `primo_piatto_1` è vuota per tutta la settimana, il file non viene generato.

### Personalizzazione Facile

- **Logo**: Modifica dimensioni e file sorgente (percorso relativo alla root del progetto)
- **Filtro Date**: Abilita/disabilita la generazione solo per date attuali e future
- **Layout**: Cambia dimensioni menu, padding, bordi
- **Colori**: Personalizza background, testi, bottoni
- **Tipografia**: Regola font size, peso, spaziatura
- **Testi**: Modifica sottotitoli, orari, call-to-action
- **Export**: Configura qualità e formato di output
- **Output**: Specifica la directory di destinazione (può essere anche fuori dal progetto, es. `../output` o `C:/Users/nome/Desktop/menu`)

## 📊 Formato CSV
Il file `menu.csv` è il cuore del sistema. Assicurati che le date siano nel formato `DD-MM-YYYY`.

```csv
giorno,primo_piatto_1,primo_piatto_2,primo_piatto_3,secondo,zuppa,insalata_1,insalata_2
16-02-2026,Penne al pomodoro,Risotto ai funghi,Fusilli al pesto,Cotoletta,Vellutata,Insalata Tonno,Insalata Pollo
```

## 🎯 Utilizzo

### Esecuzione Totale (Windows)
Fai doppio clic su `run-menu.bat`. Il comando orchestrerà tre fasi:
1. 🍛 **Menu Giornalieri**: Genera i PNG per i social.
2. 📅 **Menu Settimanali (Premium)**: Genera i PDF A4 per il bar.
3. 💼 **Menu BFT (Business)**: Genera i PDF A4 per le aziende convenzionate.

### Esecuzione Manuale
```bash
node giornaliero.js
node settimanale.js
node menu-bft.js
```

### Menu Giornalieri (con Filtro Date)

Genera un'immagine PNG per ogni giorno dalla data odierna in avanti utilizzando la configurazione JSON:

```bash
node giornaliero.js
```

**Il sistema:**
1. Carica automaticamente `config-giornaliero.json`
2. Verifica lo stato del filtro date
3. Filtra automaticamente le date passate (se `dateFilter.enabled: true`)
4. Applica tutte le personalizzazioni
5. Compila correttamente il logo SVG
6. Genera CSS dinamico dalle impostazioni

**Output (nella cartella specificata in config):**
- `output/menu_DD_mese_YYYY.png` (immagine finale con design rinnovato)
- `output/menu_DD_mese_YYYY.html` (file debug, se `htmlDebug: true`)

**Log esempio con filtro ABILITATO:**
```
🚀 Avvio compilazione menu...

📋 Trovate 10 righe nel CSV

📅 Filtro date ABILITATO: elaboro solo date dalla data odierna in avanti

⏭️  Saltate 3 date passate

📊 Processerò 7 menu

📅 Processando: Lunedì 18 Novembre 2025
✅ Creato: menu_18_novembre_2025.png
...
```

**Log esempio con filtro DISABILITATO:**
```
🚀 Avvio compilazione menu...

📋 Trovate 10 righe nel CSV

📅 Filtro date DISABILITATO: elaboro tutte le date del CSV

📊 Processerò 10 menu

📅 Processando: Lunedì 10 Novembre 2025
✅ Creato: menu_10_novembre_2025.png
...
```

### Menu Settimanali

Genera un'immagine PNG con tutti i giorni della settimana:

```bash
node settimanale.js
```

**Output (nella cartella specificata in config):**
- `output/menu_settimanale.png` (immagine finale)
- `output/menu_settimanale.html` (file debug, se `htmlDebug: true`)

## 🔧 Manutenzione
- **Pulizia Automatica**: I file temporanei di debug (`debug_*.html`) vengono eliminati automaticamente dopo la generazione.
- **Errori**: Se uno script fallisce, il file `.bat` si ferma e mostra il log dell'errore per facilitare il debug.

### Modificare il Design tramite File di Configurazione
1. Edita `config-giornaliero.json` o `config-settimanale.json` per cambiare colori, dimensioni, testi
2. Configura il filtro date secondo le tue esigenze (`enabled: true/false`)
3. Riavvia lo script per applicare le modifiche
4. Non è necessario modificare il codice!

### Modificare il Template HTML (Avanzato)
1. Edita `template_giornaliero.html` per modifiche strutturali
2. Usa i placeholder dinamici: `[SUBTITLE]`, `[HOURS]`, `[CTA]`, etc.
3. Il CSS viene generato dinamicamente dalla configurazione

### Placeholder Disponibili
- `[DATA]` - Data formattata in italiano
- `[SUBTITLE]` - Sottotitolo (da config)
- `[HOURS]` - Orari di apertura (da config)
- `[CTA]` - Call-to-action (da config)
- `[SECTION_PRIMI]`, `[SECTION_SECONDI]`, etc. - Titoli sezioni (da config)

### Configurazione Directory Output
La directory di output può essere specificata nei file di configurazione:
```json
"output": {
  "directory": "output",        // Percorso relativo o assoluto
  "htmlDebug": true             // Salva anche file HTML per debug
}
```

Esempi di percorsi validi:
- `"output"` - Cartella nella directory del progetto
- `"../menu-generati"` - Cartella nel livello superiore
- `"C:/Users/nome/Desktop/menu"` - Percorso assoluto Windows
- `"/home/user/menu"` - Percorso assoluto Linux/Mac

## 🐛 Risoluzione Problemi

### Logo non visualizzato
- ✅ **RISOLTO**: Il sistema ora compila correttamente il logo SVG
- Verifica che il logo esista nel percorso specificato in config (`asset/logo.svg`)
- Il sistema sostituisce automaticamente font non compatibili

### Errore "Node.js non trovato"
- **Windows**: Assicurati che Node.js sia installato e aggiunto al PATH di sistema
- Riavvia il terminale/prompt dei comandi dopo l'installazione di Node.js
- Verifica l'installazione con `node --version` nel prompt dei comandi

### Errore "File non trovato"
- Verifica che `menu.csv` esista nella directory
- Controlla che i template HTML siano presenti
- Verifica che i file di configurazione (`config-giornaliero.json`, `config-settimanale.json`) esistano

### Dipendenze mancanti
- Il batch script `run-menu.bat` installa automaticamente le dipendenze se mancanti
- Manualmente: esegui `npm install` nella directory del progetto

### Date non riconosciute
- Verifica il formato data nel CSV (DD-MM-YYYY, DD/MM/YYYY, DD\MM\YYYY)
- Controlla che non ci siano spazi extra

### Nessun menu generato (con filtro abilitato)
- ⚠️ Se vedi il messaggio "Nessun menu da generare", il CSV non contiene date dalla data odierna in avanti
- Verifica le date nel CSV
- Se vuoi generare tutti i menu (incluse date passate), imposta `"enabled": false` in `dateFilter`

### Design non applicato
- Verifica la sintassi JSON nei file di configurazione
- Controlla i log di console per errori di configurazione

### Errore nella directory di output
- Verifica che il percorso specificato in `output.directory` sia valido
- Il sistema crea automaticamente la directory se non esiste
- Per percorsi assoluti, assicurati di avere i permessi di scrittura

## 📝 Log e Debug

Gli script forniscono log dettagliati:
- ✅ Caricamento configurazione da file JSON specifici
- ✅ Stato filtro date (abilitato/disabilitato)
- ✅ Conteggio righe CSV totali e processate
- ✅ Conteggio date saltate (se filtro attivo)
- ✅ Avviso se non ci sono menu da generare
- ✅ Creazione directory di output
- ✅ Compilazione logo SVG con font compatibili
- ✅ Applicazione CSS dinamico
- 📋 Parsing CSV e headers rilevati
- 📅 Formattazione date
- ⚙️ Elaborazione di ogni menu
- 💾 Salvataggio file HTML e PNG nella directory configurata
- 📌 Riepilogo finale con statistiche elaborazione

I file HTML generati possono essere aperti nel browser per debug visivo.

## 🔄 Workflow Consigliato

1. **Personalizza** i file di configurazione per il tuo branding (una tantum):
   - `config-giornaliero.json` per menu giornalieri
   - `config-settimanale.json` per menu settimanali
2. **Configura** la directory di output desiderata in entrambi i config
3. **Configura** il filtro date (`dateFilter.enabled`) secondo le tue esigenze
4. **Aggiorna** `menu.csv` con i nuovi piatti
5. **Esegui** lo script:
   - **Windows**: Doppio click su `run-menu.bat` (esegue entrambi gli script)
   - **Manuale**: `node giornaliero.js` e/o `node settimanale.js`
6. **Verifica** i PNG generati nella directory di output configurata
7. **Pubblica** sui social media di MeridianaCafè

## 📋 Dipendenze

- **Node.js** (v14 o superiore)
- **Puppeteer** (v24.26.1) - Per la generazione PNG
- **Connessione Internet** - Per il caricamento font (opzionale, usa fallback)

## 🆕 Novità Versione Corrente

### Filtro Date Intelligente (NUOVO!)
- ✅ Generazione automatica solo per date dalla data odierna in avanti
- ✅ Attivabile/disattivabile tramite `dateFilter.enabled` in config-giornaliero.json
- ✅ Ottimizza tempi di elaborazione saltando date passate
- ✅ Log dettagliati che mostrano chiaramente se il filtro è attivo o disattivo
- ✅ Conteggio date saltate e processate
- ✅ Avviso se il CSV non contiene date valide (quando filtro attivo)
- ✅ Riepilogo finale con statistiche complete
- ✅ Controllo totale: `true` per filtrare, `false` per processare tutto

### Sistema di Configurazione Separato
- ✅ File `config-giornaliero.json` e `config-settimanale.json` per personalizzazione specifica
- ✅ CSS dinamico generato dalla configurazione
- ✅ Configurazione directory di output flessibile (anche per percorsi assoluti)
- ✅ Supporto per percorsi relativi e assoluti

### Struttura File Organizzata
- ✅ Logo spostato in cartella `asset/`
- ✅ Output centralizzato in cartella `output/` (configurabile)
- ✅ Separazione chiara tra sorgenti e output

### Logo Ottimizzato
- ✅ Compilazione corretta del logo SVG
- ✅ Percorso configurabile tramite JSON
- ✅ Sostituzione automatica font non compatibili
- ✅ Dimensioni configurabili per ogni tipo di menu

### UI Rinnovata
- ✅ Design moderno con effetti visivi
- ✅ Tipografia migliorata per leggibilità
- ✅ Gerarchia visiva ottimizzata
- ✅ CTA più prominente
- ✅ Layout settimanale ottimizzato per più giorni

## 📞 Supporto

Per problemi o personalizzazioni, verifica:
1. I log di console per errori specifici
2. La sintassi dei file di configurazione JSON
3. Le date nel CSV e la configurazione del filtro date
4. I percorsi dei file (logo, output, etc.)
5. I file HTML generati per debug visivo (se `htmlDebug: true`)
6. La struttura del CSV e i formati data
7. I permessi di scrittura sulla directory di output

---

**MeridianaCafè** - Tavola Calda  
*Sistema di generazione menu automatico con configurazione avanzata e filtro date intelligente*