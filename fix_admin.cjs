const fs = require('fs');

const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

// Replace publishCreate
const oldPublishCreate = `      function publishCreate(title, author, series, seriesOrder, bodyText, slug) {
        var fileEntries = [];
        fileEntries.push({ file: coverFile, path: 'src/assets/books/' + slug + '/cover.' + ext(coverFile.name), label: coverFile.name });
        exampleItems.forEach(function (item, i) {
          fileEntries.push({ file: item.file, path: 'src/assets/books/' + slug + '/example-' + (i + 1) + '.' + ext(item.file.name), label: item.file.name });
        });
        fileEntries.push({ file: colorEpubFile, path: 'public/books/' + slug + '/' + colorEpubFile.name, label: colorEpubFile.name });
        fileEntries.push({ file: bwEpubFile, path: 'public/books/' + slug + '/' + bwEpubFile.name, label: bwEpubFile.name });

        var totalSteps = fileEntries.length + 1;
        var completed = 0;
        var treeEntries = [];

        setProgress(0, 'Получение текущего состояния…');

        getHeadContext()
          .then(function (ctx) {
            var chain = Promise.resolve();
            fileEntries.forEach(function (entry) {
              chain = chain.then(function () {
                setProgress(Math.round((completed / totalSteps) * 88), 'Загрузка: ' + entry.label + ' (' + (completed + 1) + ' из ' + totalSteps + ')');
                return readFileAsBase64(entry.file).then(function (b64) {
                  return uploadBlob(b64).then(function (blob) {
                    treeEntries.push({ path: entry.path, mode: '100644', type: 'blob', sha: blob.sha });
                    completed++;
                  });
                });
              });
            });
            return chain.then(function () { return ctx; });
          })
          .then(function (ctx) {
            setProgress(Math.round((completed / totalSteps) * 88), 'Создание файла книги…');
            var coverExt = ext(coverFile.name);
            var md = buildMarkdown(title, author, slug, coverExt, exampleItems, series, seriesOrder, bodyText, colorEpubFile.name, bwEpubFile.name);
            return uploadBlob(btoa(unescape(encodeURIComponent(md)))).then(function (mdBlob) {
              treeEntries.push({ path: 'src/content/books/' + slug + '.md', mode: '100644', type: 'blob', sha: mdBlob.sha });
              completed++;
              return ctx;
            });
          })
          .then(function (ctx) {
            setProgress(92, 'Создание коммита…');
            return createCommitAndPush(ctx, treeEntries, 'Add book: ' + title);
          })
          .then(function () {
            setProgress(100, '');
            showOverlayResult('Книга опубликована!', 'Деплой запустится автоматически.', 'https://sm1-tee.github.io/chit-ai/books/' + slug + '/');
            showView('list');
            loadBooks();
          })
          .catch(function (err) {
            setProgress(0, '');
            showOverlayResult('Ошибка публикации', err.message, null);
          });
      }`;

const newPublishCreate = `      function publishCreate(title, author, series, seriesOrder, bodyText, slug) {
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

        var totalSteps = fileEntries.length + 1;
        var completed = 0;
        var chain = Promise.resolve();
        
        fileEntries.forEach(function(entry) {
          chain = chain.then(function() {
             setProgress(Math.round((completed / totalSteps) * 90), 'Загрузка: ' + entry.label + ' (' + (completed + 1) + ' из ' + totalSteps + ')');
             return readFileAsBase64(entry.file).then(function(b64) {
               return uploadBlob(b64);
             }).then(function(blob) {
               return getHeadContext().then(function(ctx) {
                 var treeEntries = [{ path: entry.path, mode: '100644', type: 'blob', sha: blob.sha }];
                 return ghFetch('/repos/' + REPO + '/git/trees', {
                   method: 'POST',
                   body: JSON.stringify({ base_tree: ctx.baseTreeSha, tree: treeEntries })
                 }).then(function(tree) {
                   return ghFetch('/repos/' + REPO + '/git/commits', {
                     method: 'POST',
                     body: JSON.stringify({ message: 'Add book file: ' + entry.label, tree: tree.sha, parents: [ctx.commitSha] })
                   });
                 }).then(function(newCommit) {
                   return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                     method: 'PATCH',
                     body: JSON.stringify({ sha: newCommit.sha })
                   });
                 });
               });
             }).then(function() {
               completed++;
             });
          });
        });

        chain.then(function() {
          setProgress(95, 'Создание файла книги...');
          return uploadBlob(btoa(unescape(encodeURIComponent(md)))).then(function(mdBlob) {
            return getHeadContext().then(function(ctx) {
              var treeEntries = [{ path: mdPath, mode: '100644', type: 'blob', sha: mdBlob.sha }];
              return ghFetch('/repos/' + REPO + '/git/trees', {
                method: 'POST',
                body: JSON.stringify({ base_tree: ctx.baseTreeSha, tree: treeEntries })
              }).then(function(tree) {
                return ghFetch('/repos/' + REPO + '/git/commits', {
                  method: 'POST',
                  body: JSON.stringify({ message: 'Add book: ' + title, tree: tree.sha, parents: [ctx.commitSha] })
                });
              }).then(function(newCommit) {
                return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                  method: 'PATCH',
                  body: JSON.stringify({ sha: newCommit.sha })
                });
              });
            });
          });
        })
        .then(function () {
          setProgress(100, '');
          showOverlayResult('Книга опубликована!', 'Все файлы загружены. Деплой запущен.', 'https://sm1-tee.github.io/chit-ai/books/' + slug + '/');
          showView('list');
          loadBooks();
        })
        .catch(function (err) {
          setProgress(0, '');
          showOverlayResult('Ошибка публикации', err.message, null);
        });
      }`;

content = content.replace(oldPublishCreate, newPublishCreate);

// Replace publishEdit
const oldPublishEdit = `        var totalSteps = uploadTasks.length + 1;
            var completed = 0;

            var chain = Promise.resolve();
            uploadTasks.forEach(function (task) {
              chain = chain.then(function () {
                setProgress(10 + Math.round((completed / totalSteps) * 72), 'Загрузка: ' + task.label);
                return readFileAsBase64(task.file).then(function (b64) {
                  return uploadBlob(b64).then(function (blob) {
                    treeEntries.push({ path: task.path, mode: '100644', type: 'blob', sha: blob.sha });
                    completed++;
                  });
                });
              });
            });

            return chain.then(function () { return coverExt; });
          })
          .then(function (coverExt) {
            setProgress(84, 'Создание файла книги…');
            var colorName = colorEpubFile ? colorEpubFile.name : colorEpubExisting ? colorEpubExisting.path.split('/').pop() : 'color.epub';
            var bwName = bwEpubFile ? bwEpubFile.name : bwEpubExisting ? bwEpubExisting.path.split('/').pop() : 'bw.epub';
            var md = buildMarkdown(title, author, newSlug, coverExt, exampleItems, series, seriesOrder, bodyText, colorName, bwName);
            return uploadBlob(btoa(unescape(encodeURIComponent(md)))).then(function (mdBlob) {
              treeEntries.push({ path: 'src/content/books/' + newSlug + '.md', mode: '100644', type: 'blob', sha: mdBlob.sha });
            });
          })
          .then(function () {
            setProgress(90, 'Создание коммита…');
            var deduped = {};
            treeEntries.forEach(function (e) { deduped[e.path] = e; });
            treeEntries = Object.keys(deduped).map(function (k) { return deduped[k]; });
            return createCommitAndPush(ctx, treeEntries, 'Update book: ' + title);
          })`;

const newPublishEdit = `        var totalSteps = uploadTasks.length + 1;
            var completed = 0;

            // Delete old files that are no longer needed (from treeEntries mapping) by using existing treeEntries
            // Wait, to do it sequentially, we commit the base files first, then sequentially add blobs.
            var deduped = {};
            treeEntries.forEach(function (e) { deduped[e.path] = e; });
            treeEntries = Object.keys(deduped).map(function (k) { return deduped[k]; });
            
            var chain = Promise.resolve();
            
            // First commit the old files deletion / restructuring if necessary
            chain = chain.then(function() {
              setProgress(10, 'Подготовка структуры файлов...');
              return createCommitAndPush(ctx, treeEntries, 'Update book structure: ' + title);
            });

            uploadTasks.forEach(function (task) {
              chain = chain.then(function () {
                setProgress(10 + Math.round((completed / totalSteps) * 72), 'Загрузка: ' + task.label);
                return readFileAsBase64(task.file).then(function (b64) {
                  return uploadBlob(b64);
                }).then(function (blob) {
                  return getHeadContext().then(function(currentCtx) {
                    var newTreeEntries = [{ path: task.path, mode: '100644', type: 'blob', sha: blob.sha }];
                    return ghFetch('/repos/' + REPO + '/git/trees', {
                      method: 'POST',
                      body: JSON.stringify({ base_tree: currentCtx.baseTreeSha, tree: newTreeEntries })
                    }).then(function(tree) {
                      return ghFetch('/repos/' + REPO + '/git/commits', {
                        method: 'POST',
                        body: JSON.stringify({ message: 'Update book file: ' + task.label, tree: tree.sha, parents: [currentCtx.commitSha] })
                      });
                    }).then(function(newCommit) {
                      return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                        method: 'PATCH',
                        body: JSON.stringify({ sha: newCommit.sha })
                      });
                    });
                  });
                }).then(function() {
                  completed++;
                });
              });
            });

            return chain.then(function () { return coverExt; });
          })
          .then(function (coverExt) {
            setProgress(90, 'Создание файла книги…');
            var colorName = colorEpubFile ? colorEpubFile.name : colorEpubExisting ? colorEpubExisting.path.split('/').pop() : 'color.epub';
            var bwName = bwEpubFile ? bwEpubFile.name : bwEpubExisting ? bwEpubExisting.path.split('/').pop() : 'bw.epub';
            var md = buildMarkdown(title, author, newSlug, coverExt, exampleItems, series, seriesOrder, bodyText, colorName, bwName);
            return uploadBlob(btoa(unescape(encodeURIComponent(md)))).then(function (mdBlob) {
              return getHeadContext().then(function(currentCtx) {
                var mdTree = [{ path: 'src/content/books/' + newSlug + '.md', mode: '100644', type: 'blob', sha: mdBlob.sha }];
                return ghFetch('/repos/' + REPO + '/git/trees', {
                  method: 'POST',
                  body: JSON.stringify({ base_tree: currentCtx.baseTreeSha, tree: mdTree })
                }).then(function(tree) {
                  return ghFetch('/repos/' + REPO + '/git/commits', {
                    method: 'POST',
                    body: JSON.stringify({ message: 'Update book: ' + title, tree: tree.sha, parents: [currentCtx.commitSha] })
                  });
                }).then(function(newCommit) {
                  return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                    method: 'PATCH',
                    body: JSON.stringify({ sha: newCommit.sha })
                  });
                });
              });
            });
          })`;

content = content.replace(oldPublishEdit, newPublishEdit);
fs.writeFileSync(path, content, 'utf8');
console.log('Admin file updated with sequential commits.');
