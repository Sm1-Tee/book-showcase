const fs = require('fs');
const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

// Replace drag-n-drop EPUB fields with text inputs for URLs
const oldEpubFields = `          <div class="field">
            <label>EPUB (цветной)</label>
            <div class="drop-zone" id="colorEpubZone">
              <span>Перетащите файл или нажмите для выбора</span>
              <input type="file" accept=".epub" id="colorEpubInput" />
            </div>
            <div class="epub-name" id="colorEpubName"></div>
          </div>

          <div class="field">
            <label>EPUB (ч/б)</label>
            <div class="drop-zone" id="bwEpubZone">
              <span>Перетащите файл или нажмите для выбора</span>
              <input type="file" accept=".epub" id="bwEpubInput" />
            </div>
            <div class="epub-name" id="bwEpubName"></div>
          </div>`;

const newEpubFields = `          <div class="field">
            <label for="colorEpubUrl">Ссылка на цветной EPUB (GitHub Releases)</label>
            <input type="text" id="colorEpubUrl" placeholder="https://github.com/Sm1-Tee/chit-ai/releases/download/..." required />
          </div>

          <div class="field">
            <label for="bwEpubUrl">Ссылка на ч/б EPUB (GitHub Releases)</label>
            <input type="text" id="bwEpubUrl" placeholder="https://github.com/Sm1-Tee/chit-ai/releases/download/..." required />
          </div>`;

content = content.replace(oldEpubFields, newEpubFields);

fs.writeFileSync(path, content, 'utf8');
console.log('Fields replaced');
