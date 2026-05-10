const fs = require('fs');
const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove old epub variables & add new URL inputs to 'el'
content = content.replace(/var colorEpubFile = null;\s+var colorEpubExisting = null;\s+var bwEpubFile = null;\s+var bwEpubExisting = null;/, '');

const oldElKeys = `        colorEpubInput: document.getElementById('colorEpubInput'),
        colorEpubZone: document.getElementById('colorEpubZone'),
        colorEpubName: document.getElementById('colorEpubName'),
        bwEpubInput: document.getElementById('bwEpubInput'),
        bwEpubZone: document.getElementById('bwEpubZone'),
        bwEpubName: document.getElementById('bwEpubName'),`;

const newElKeys = `        colorEpubUrl: document.getElementById('colorEpubUrl'),
        bwEpubUrl: document.getElementById('bwEpubUrl'),`;

content = content.replace(oldElKeys, newElKeys);

// 2. Remove epub dropzone setup and events
const dropZoneEpub = `      setupDropZone(el.colorEpubZone, el.colorEpubInput);
      setupDropZone(el.bwEpubZone, el.bwEpubInput);`;
content = content.replace(dropZoneEpub, '');

const oldEpubEvents = `      /* ── EPUBs ── */

      el.colorEpubInput.addEventListener('change', function () {
        var f = el.colorEpubInput.files[0];
        if (!f) return;
        colorEpubFile = f;
        colorEpubExisting = null;
        el.colorEpubName.textContent = f.name;
        validateForm();
      });

      el.bwEpubInput.addEventListener('change', function () {
        var f = el.bwEpubInput.files[0];
        if (!f) return;
        bwEpubFile = f;
        bwEpubExisting = null;
        el.bwEpubName.textContent = f.name;
        validateForm();
      });`;
content = content.replace(oldEpubEvents, `      el.colorEpubUrl.addEventListener('input', validateForm);
      el.bwEpubUrl.addEventListener('input', validateForm);`);

// 3. Update validation logic
const oldValidation = `          (colorEpubFile || colorEpubExisting) &&
          (bwEpubFile || bwEpubExisting);`;
const newValidation = `          el.colorEpubUrl.value.trim() &&
          el.bwEpubUrl.value.trim();`;
content = content.replace(oldValidation, newValidation);

// 4. Update Form Reset
const oldReset = `        colorEpubFile = null;
        colorEpubExisting = null;
        bwEpubFile = null;
        bwEpubExisting = null;`;
content = content.replace(oldReset, `        el.colorEpubUrl.value = '';
        el.bwEpubUrl.value = '';`);

const oldEpubNamesClear = `        el.colorEpubName.textContent = '';
        el.bwEpubName.textContent = '';`;
content = content.replace(oldEpubNamesClear, '');

// 5. Update startEdit
const oldStartEditEpubs = `        colorEpubExisting = { path: getRepoPath(book.colorEpub) };
        bwEpubExisting = { path: getRepoPath(book.bwEpub) };
        el.colorEpubName.textContent = 'Текущий файл: ' + book.colorEpub.split('/').pop();
        el.bwEpubName.textContent = 'Текущий файл: ' + book.bwEpub.split('/').pop();`;

const newStartEditEpubs = `        el.colorEpubUrl.value = book.colorEpub;
        el.bwEpubUrl.value = book.bwEpub;`;
content = content.replace(oldStartEditEpubs, newStartEditEpubs);

// 6. Update publishCreate
const oldPubCreateVars = `      function publishCreate(title, author, series, seriesOrder, bodyText, slug) {
        var fileEntries = [];
        fileEntries.push({ file: coverFile, path: 'src/assets/books/' + slug + '/cover.' + ext(coverFile.name), label: coverFile.name });
        exampleItems.forEach(function (item, i) {
          fileEntries.push({ file: item.file, path: 'src/assets/books/' + slug + '/example-' + (i + 1) + '.' + ext(item.file.name), label: item.file.name });
        });
        fileEntries.push({ file: colorEpubFile, path: 'public/books/' + slug + '/' + colorEpubFile.name, label: colorEpubFile.name });
        fileEntries.push({ file: bwEpubFile, path: 'public/books/' + slug + '/' + bwEpubFile.name, label: bwEpubFile.name });

        setProgress(0, 'Начинаем поэтапную загрузку файлов...');
        var coverExt = ext(coverFile.name);
        var mdPath = 'src/content/books/' + slug + '.md';
        var md = buildMarkdown(title, author, slug, coverExt, exampleItems, series, seriesOrder, bodyText, colorEpubFile.name, bwEpubFile.name);`;

const newPubCreateVars = `      function publishCreate(title, author, series, seriesOrder, bodyText, slug) {
        var fileEntries = [];
        fileEntries.push({ file: coverFile, path: 'src/assets/books/' + slug + '/cover.' + ext(coverFile.name), label: coverFile.name });
        exampleItems.forEach(function (item, i) {
          fileEntries.push({ file: item.file, path: 'src/assets/books/' + slug + '/example-' + (i + 1) + '.' + ext(item.file.name), label: item.file.name });
        });

        setProgress(0, 'Начинаем поэтапную загрузку файлов...');
        var coverExt = ext(coverFile.name);
        var mdPath = 'src/content/books/' + slug + '.md';
        var md = buildMarkdown(title, author, slug, coverExt, exampleItems, series, seriesOrder, bodyText, el.colorEpubUrl.value.trim(), el.bwEpubUrl.value.trim());`;
content = content.replace(oldPubCreateVars, newPubCreateVars);

// 7. Update publishEdit
const oldPubEditEpubLogics = `              var colorName = 'color.epub';
              if (colorEpubFile) {
                colorName = colorEpubFile.name;
                uploadTasks.push({ file: colorEpubFile, path: 'public/books/' + newSlug + '/' + colorName, label: colorName });
              } else if (colorEpubExisting) {
                colorName = colorEpubExisting.path.split('/').pop();
                treeEntries.push({ path: 'public/books/' + newSlug + '/' + colorName, mode: '100644', type: 'blob', sha: existingFiles[colorEpubExisting.path] });
              }

              var bwName = 'bw.epub';
              if (bwEpubFile) {
                bwName = bwEpubFile.name;
                uploadTasks.push({ file: bwEpubFile, path: 'public/books/' + newSlug + '/' + bwName, label: bwName });
              } else if (bwEpubExisting) {
                bwName = bwEpubExisting.path.split('/').pop();
                treeEntries.push({ path: 'public/books/' + newSlug + '/' + bwName, mode: '100644', type: 'blob', sha: existingFiles[bwEpubExisting.path] });
              }`;
              
content = content.replace(oldPubEditEpubLogics, '');

const oldBuildMdEdit = `              var colorName = colorEpubFile ? colorEpubFile.name : colorEpubExisting ? colorEpubExisting.path.split('/').pop() : 'color.epub';
            var bwName = bwEpubFile ? bwEpubFile.name : bwEpubExisting ? bwEpubExisting.path.split('/').pop() : 'bw.epub';
            
            chain = chain.then(function() {
               var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
               var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, colorName, bwName);`;

const newBuildMdEdit = `            chain = chain.then(function() {
               var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
               var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, el.colorEpubUrl.value.trim(), el.bwEpubUrl.value.trim());`;
// Fixing a slight discrepancy in replace match by doing a simpler string replacement
content = content.replace(`              var mdPath = 'src/content/books/' + newSlug + '.md';
              var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
              var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, colorName, bwName);`, 
              `              var mdPath = 'src/content/books/' + newSlug + '.md';
              var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
              var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, el.colorEpubUrl.value.trim(), el.bwEpubUrl.value.trim());`);


// 8. Update buildMarkdown (to not prepend /books/ if it's already a full URL)
const oldMdBuilder = `        fm += 'colorEpub: "/books/' + slug + '/' + colorEpubName + '"\\n';
        fm += 'bwEpub: "/books/' + slug + '/' + bwEpubName + '"\\n';`;

const newMdBuilder = `        fm += 'colorEpub: "' + colorEpubName + '"\\n';
        fm += 'bwEpub: "' + bwEpubName + '"\\n';`;
content = content.replace(oldMdBuilder, newMdBuilder);

// 9. Get rid of EPUB from batch creation (since we no longer upload EPUBs)
const oldBatchGrouping = `        var imgEntries = [];
        var colorEpubEntry = null;
        var bwEpubEntry = null;

        fileEntries.forEach(function(e) {
          if (e.path.indexOf('.epub') !== -1) {
            if (e.label.toLowerCase().indexOf('чб') !== -1 || e.label.toLowerCase().indexOf('bw') !== -1) bwEpubEntry = e;
            else colorEpubEntry = e;
          } else {
            imgEntries.push(e);
          }
        });`;
content = content.replace(oldBatchGrouping, `        var imgEntries = fileEntries;`);

const oldBatchSteps = `        chain = chain.then(function(ctx) {
          setProgress(25, 'Пакет 1/4: Загрузка картинок...');
          return processBatch(ctx, imgEntries, commitMsgPrefix + ' (Изображения)');
        });

        chain = chain.then(function(ctx) {
          if (!colorEpubEntry) return ctx;
          setProgress(50, 'Пакет 2/4: Загрузка цветного EPUB...');
          return processBatch(ctx, [colorEpubEntry], commitMsgPrefix + ' (Цветной EPUB)');
        });

        chain = chain.then(function(ctx) {
          if (!bwEpubEntry) return ctx;
          setProgress(75, 'Пакет 3/4: Загрузка ч/б EPUB...');
          return processBatch(ctx, [bwEpubEntry], commitMsgPrefix + ' (Ч/Б EPUB)');
        });

        chain = chain.then(function(ctx) {
          setProgress(90, 'Пакет 4/4: Финализация файла книги...');`;

const newBatchSteps = `        chain = chain.then(function(ctx) {
          setProgress(40, 'Шаг 1/2: Загрузка картинок...');
          return processBatch(ctx, imgEntries, commitMsgPrefix + ' (Изображения)');
        });

        chain = chain.then(function(ctx) {
          setProgress(90, 'Шаг 2/2: Финализация данных книги...');`;
content = content.replace(oldBatchSteps, newBatchSteps);


fs.writeFileSync(path, content, 'utf8');
