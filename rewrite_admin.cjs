const fs = require('fs');
const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('/* ── Git helpers ── */');
const endIdx = content.indexOf('/* ── Delete ── */');

const newCode = `/* ── Git helpers ── */

      function getHeadContext() {
        return ghFetch('/repos/' + REPO + '/git/ref/heads/' + BRANCH)
          .then(function (ref) {
            var commitSha = ref.object.sha;
            return ghFetch('/repos/' + REPO + '/git/commits/' + commitSha).then(function (commit) {
              return { commitSha: commitSha, baseTreeSha: commit.tree.sha };
            });
          });
      }

      function getRecursiveTree(treeSha) {
        return ghFetch('/repos/' + REPO + '/git/trees/' + treeSha + '?recursive=1');
      }

      function createCommitAndPush(ctx, treeEntries, message) {
        return ghFetch('/repos/' + REPO + '/git/trees', {
          method: 'POST',
          body: JSON.stringify({ base_tree: ctx.baseTreeSha, tree: treeEntries }),
        })
          .then(function (tree) {
            return ghFetch('/repos/' + REPO + '/git/commits', {
              method: 'POST',
              body: JSON.stringify({ message: message, tree: tree.sha, parents: [ctx.commitSha] }),
            }).then(function (newCommit) {
              return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                method: 'PATCH',
                body: JSON.stringify({ force: true, sha: newCommit.sha }),
              }).then(function() {
                return { commitSha: newCommit.sha, baseTreeSha: tree.sha };
              });
            });
          });
      }

      function buildMarkdown(title, author, slug, coverExt, exItems, series, seriesOrder, bodyText, colorEpubName, bwEpubName) {
        var fm = '---\\n';
        fm += 'title: "' + title + '"\\n';
        fm += 'author: "' + author + '"\\n';
        fm += 'coverImage: "../../assets/books/' + slug + '/cover.' + coverExt + '"\\n';
        fm += 'exampleImages:\\n';
        exItems.forEach(function (item, i) {
          var e = item.type === 'new' ? ext(item.file.name) : item.ext;
          fm += '  - "../../assets/books/' + slug + '/example-' + (i + 1) + '.' + e + '"\\n';
        });
        fm += 'colorEpub: "/books/' + slug + '/' + colorEpubName + '"\\n';
        fm += 'bwEpub: "/books/' + slug + '/' + bwEpubName + '"\\n';
        if (series) fm += 'series: "' + series + '"\\n';
        if (seriesOrder) fm += 'seriesOrder: ' + seriesOrder + '\\n';
        fm += '---\\n\\n';
        return fm + bodyText;
      }

      function uploadBlob(content, encoding) {
        return ghFetch('/repos/' + REPO + '/git/blobs', {
          method: 'POST',
          body: JSON.stringify({ content: content, encoding: encoding || 'base64' }),
        });
      }

      function createCommitAndPushBatches(initialCtxPromise, fileEntries, mdContent, mdPath, commitMsgPrefix) {
        var imgEntries = [];
        var colorEpubEntry = null;
        var bwEpubEntry = null;

        fileEntries.forEach(function(e) {
          if (e.path.indexOf('.epub') !== -1) {
            if (e.label.toLowerCase().indexOf('чб') !== -1 || e.label.toLowerCase().indexOf('bw') !== -1) bwEpubEntry = e;
            else colorEpubEntry = e;
          } else {
            imgEntries.push(e);
          }
        });

        function processBatch(ctx, entries, msg) {
           if (entries.length === 0) return Promise.resolve(ctx);
           var promises = entries.map(function(entry) {
              return readFileAsBase64(entry.file)
                .then(function(b64) { return uploadBlob(b64); })
                .then(function(blob) { return { path: entry.path, mode: '100644', type: 'blob', sha: blob.sha }; });
           });
           return Promise.all(promises).then(function(treeEntries) {
              return createCommitAndPush(ctx, treeEntries, msg);
           });
        }

        var chain = initialCtxPromise;

        chain = chain.then(function(ctx) {
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
          setProgress(90, 'Пакет 4/4: Финализация файла книги...');
          return uploadBlob(btoa(unescape(encodeURIComponent(mdContent)))).then(function(mdBlob) {
             var treeEntries = [{ path: mdPath, mode: '100644', type: 'blob', sha: mdBlob.sha }];
             return createCommitAndPush(ctx, treeEntries, commitMsgPrefix + ' (Финальный файл)');
          });
        });

        return chain;
      }

      /* ── Publish (create) ── */

      function publishCreate(title, author, series, seriesOrder, bodyText, slug) {
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
        var md = buildMarkdown(title, author, slug, coverExt, exampleItems, series, seriesOrder, bodyText, colorEpubFile.name, bwEpubFile.name);

        createCommitAndPushBatches(getHeadContext(), fileEntries, md, mdPath, 'Add book: ' + title)
          .then(function () {
            setProgress(100, '');
            showOverlayResult('Книга опубликована!', 'Все пакеты успешно загружены.', 'https://sm1-tee.github.io/chit-ai/books/' + slug + '/');
            showView('list');
            loadBooks();
          })
          .catch(function (err) {
            setProgress(0, '');
            showOverlayResult('Ошибка публикации', err.message, null);
          });
      }

      /* ── Publish (edit) ── */

      function publishEdit(title, author, series, seriesOrder, bodyText, newSlug) {
        var oldSlug = editingSlug;
        var treeEntries = [];
        var uploadTasks = [];

        setProgress(0, 'Получение текущего состояния…');

        getHeadContext()
          .then(function (ctx) {
            setProgress(5, 'Анализ файлов…');
            return getRecursiveTree(ctx.baseTreeSha).then(function(tree) {
              var existingFiles = {};
              var oldPublicPrefix = 'public/books/' + oldSlug + '/';
              var oldAssetsPrefix = 'src/assets/books/' + oldSlug + '/';
              var oldMd = 'src/content/books/' + oldSlug + '.md';
              tree.tree.forEach(function (entry) {
                if (entry.type === 'blob' && (entry.path.indexOf(oldPublicPrefix) === 0 || entry.path.indexOf(oldAssetsPrefix) === 0 || entry.path === oldMd)) {
                  existingFiles[entry.path] = entry.sha;
                }
              });

              Object.keys(existingFiles).forEach(function (path) {
                treeEntries.push({ path: path, mode: '100644', type: 'blob', sha: null });
              });

              var coverExt;
              if (coverFile) {
                coverExt = ext(coverFile.name);
                uploadTasks.push({ file: coverFile, path: 'src/assets/books/' + newSlug + '/cover.' + coverExt, label: coverFile.name });
              } else if (coverExisting) {
                coverExt = coverExisting.ext;
                treeEntries.push({ path: 'src/assets/books/' + newSlug + '/cover.' + coverExt, mode: '100644', type: 'blob', sha: existingFiles[coverExisting.path] });
              }

              exampleItems.forEach(function (item, i) {
                if (item.type === 'new') {
                  uploadTasks.push({ file: item.file, path: 'src/assets/books/' + newSlug + '/example-' + (i + 1) + '.' + ext(item.file.name), label: item.file.name });
                } else {
                  treeEntries.push({ path: 'src/assets/books/' + newSlug + '/example-' + (i + 1) + '.' + item.ext, mode: '100644', type: 'blob', sha: existingFiles[item.path] });
                }
              });

              var colorName = 'color.epub';
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
              }

              // Filter out treeEntries mapping (deduplicate)
              var deduped = {};
              treeEntries.forEach(function (e) { deduped[e.path] = e; });
              treeEntries = Object.keys(deduped).map(function (k) { return deduped[k]; });

              var mdPath = 'src/content/books/' + newSlug + '.md';
              var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
              var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, colorName, bwName);

              var baseChain = Promise.resolve(ctx);
              
              if (treeEntries.length > 0) {
                 baseChain = baseChain.then(function(currentCtx) {
                    setProgress(10, 'Подготовка структуры файлов...');
                    return createCommitAndPush(currentCtx, treeEntries, 'Update book structure: ' + title);
                 });
              }

              return createCommitAndPushBatches(baseChain, uploadTasks, md, mdPath, 'Update book: ' + title);
            });
          })
          .then(function () {
            setProgress(100, '');
            showOverlayResult('Изменения сохранены!', 'Все пакеты успешно обновлены.', 'https://sm1-tee.github.io/chit-ai/books/' + newSlug + '/');
            showView('list');
            loadBooks();
          })
          .catch(function (err) {
            setProgress(0, '');
            showOverlayResult('Ошибка сохранения', err.message, null);
          });
      }

      `;

content = content.substring(0, startIdx) + newCode + content.substring(endIdx);
fs.writeFileSync(path, content, 'utf8');
