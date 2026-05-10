const fs = require('fs');

const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

const oldSequentialScript = `      function createCommitAndPushSequential(ctx, fileEntries, mdContent, mdPath, commitMsgPrefix) {
        var totalSteps = fileEntries.length + 1;
        var completed = 0;
        
        // Loop sequentially over each file
        var chain = Promise.resolve();
        
        fileEntries.forEach(function (entry) {
          chain = chain.then(function() {
            setProgress(Math.round((completed / totalSteps) * 90), 'Загрузка: ' + entry.label + ' (' + (completed + 1) + ' из ' + totalSteps + ')');
            
            return readFileAsBase64(entry.file).then(function(b64) {
              return uploadBlob(b64);
            }).then(function(blob) {
              // Get current HEAD fresh for each commit
              return getHeadContext().then(function(currentCtx) {
                var treeEntries = [{ path: entry.path, mode: '100644', type: 'blob', sha: blob.sha }];
                return ghFetch('/repos/' + REPO + '/git/trees', {
                  method: 'POST',
                  body: JSON.stringify({ base_tree: currentCtx.baseTreeSha, tree: treeEntries })
                }).then(function(tree) {
                  return ghFetch('/repos/' + REPO + '/git/commits', {
                    method: 'POST',
                    body: JSON.stringify({ message: commitMsgPrefix + ' (Файл: ' + entry.label + ')', tree: tree.sha, parents: [currentCtx.commitSha] })
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

        // Finally, push the Markdown file
        chain = chain.then(function() {
          setProgress(92, 'Создание файла книги...');
          return uploadBlob(btoa(unescape(encodeURIComponent(mdContent)))).then(function(mdBlob) {
             return getHeadContext().then(function(currentCtx) {
                var treeEntries = [{ path: mdPath, mode: '100644', type: 'blob', sha: mdBlob.sha }];
                return ghFetch('/repos/' + REPO + '/git/trees', {
                  method: 'POST',
                  body: JSON.stringify({ base_tree: currentCtx.baseTreeSha, tree: treeEntries })
                }).then(function(tree) {
                  return ghFetch('/repos/' + REPO + '/git/commits', {
                    method: 'POST',
                    body: JSON.stringify({ message: commitMsgPrefix + ' (Финальный файл Markdown)', tree: tree.sha, parents: [currentCtx.commitSha] })
                  });
                }).then(function(newCommit) {
                  return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                    method: 'PATCH',
                    body: JSON.stringify({ sha: newCommit.sha })
                  });
                });
             });
          });
        });

        return chain;
      }`;


const newBatchScript = `      function createCommitAndPushBatches(fileEntries, mdContent, mdPath, commitMsgPrefix) {
        // Group 1: All images (cover + examples)
        // Group 2: Color EPUB
        // Group 3: BW EPUB
        // Group 4: Markdown file
        
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

        var totalSteps = 4;
        var chain = Promise.resolve();
        
        // Helper to process a batch of files into one commit
        function processBatch(entries, stepLabel, msg) {
           if (entries.length === 0) return Promise.resolve();
           return getHeadContext().then(function(ctx) {
             var promises = entries.map(function(entry) {
                return readFileAsBase64(entry.file)
                  .then(function(b64) { return uploadBlob(b64); })
                  .then(function(blob) { return { path: entry.path, mode: '100644', type: 'blob', sha: blob.sha }; });
             });
             return Promise.all(promises).then(function(treeEntries) {
                return ghFetch('/repos/' + REPO + '/git/trees', {
                  method: 'POST',
                  body: JSON.stringify({ base_tree: ctx.baseTreeSha, tree: treeEntries })
                }).then(function(tree) {
                  return ghFetch('/repos/' + REPO + '/git/commits', {
                    method: 'POST',
                    body: JSON.stringify({ message: msg, tree: tree.sha, parents: [ctx.commitSha] })
                  });
                }).then(function(newCommit) {
                  return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                    method: 'PATCH',
                    body: JSON.stringify({ force: true, sha: newCommit.sha }) // Force helps bypass race condition lock
                  });
                });
             });
           });
        }

        // Delay helper to avoid hitting update locks
        function wait(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

        // 1. Process Images
        chain = chain.then(function() {
          setProgress(25, 'Пакет 1/4: Загрузка картинок...');
          return processBatch(imgEntries, 'картинки', commitMsgPrefix + ' (Изображения)');
        }).then(function() { return wait(1000); });

        // 2. Process Color EPUB
        chain = chain.then(function() {
          if (!colorEpubEntry) return;
          setProgress(50, 'Пакет 2/4: Загрузка цветного EPUB...');
          return processBatch([colorEpubEntry], 'цветной EPUB', commitMsgPrefix + ' (Цветной EPUB)');
        }).then(function() { return wait(1000); });

        // 3. Process BW EPUB
        chain = chain.then(function() {
          if (!bwEpubEntry) return;
          setProgress(75, 'Пакет 3/4: Загрузка ч/б EPUB...');
          return processBatch([bwEpubEntry], 'ч/б EPUB', commitMsgPrefix + ' (Ч/Б EPUB)');
        }).then(function() { return wait(1000); });

        // 4. Process Markdown
        chain = chain.then(function() {
          setProgress(90, 'Пакет 4/4: Финализация файла книги...');
          return uploadBlob(btoa(unescape(encodeURIComponent(mdContent)))).then(function(mdBlob) {
             return getHeadContext().then(function(ctx) {
                var treeEntries = [{ path: mdPath, mode: '100644', type: 'blob', sha: mdBlob.sha }];
                return ghFetch('/repos/' + REPO + '/git/trees', {
                  method: 'POST',
                  body: JSON.stringify({ base_tree: ctx.baseTreeSha, tree: treeEntries })
                }).then(function(tree) {
                  return ghFetch('/repos/' + REPO + '/git/commits', {
                    method: 'POST',
                    body: JSON.stringify({ message: commitMsgPrefix + ' (Финальный файл)', tree: tree.sha, parents: [ctx.commitSha] })
                  });
                }).then(function(newCommit) {
                  return ghFetch('/repos/' + REPO + '/git/refs/heads/' + BRANCH, {
                    method: 'PATCH',
                    body: JSON.stringify({ force: true, sha: newCommit.sha })
                  });
                });
             });
          });
        });

        return chain;
      }`;

// In publishCreate replace the loop with call to new function
const oldPublishCreateLoop = `        var totalSteps = fileEntries.length + 1;
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
        })`;

const newPublishCreateLoop = `        createCommitAndPushBatches(fileEntries, md, mdPath, 'Add book: ' + title)`;

content = content.replace(oldPublishCreateLoop, newPublishCreateLoop);

// Inject helper function
content = content.replace('      /* ── Publish (create) ── */', newBatchScript + '\n\n      /* ── Publish (create) ── */');

// Let's do the same for edit
const oldPublishEditLoop = `            uploadTasks.forEach(function (task) {
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

const newPublishEditLoop = `            // Replace logic with batch dispatcher
            var mdPath = 'src/content/books/' + newSlug + '.md';
            var colorName = colorEpubFile ? colorEpubFile.name : colorEpubExisting ? colorEpubExisting.path.split('/').pop() : 'color.epub';
            var bwName = bwEpubFile ? bwEpubFile.name : bwEpubExisting ? bwEpubExisting.path.split('/').pop() : 'bw.epub';
            
            chain = chain.then(function() {
               var coverExtToPass = coverFile ? ext(coverFile.name) : coverExisting ? coverExisting.ext : 'jpg';
               var md = buildMarkdown(title, author, newSlug, coverExtToPass, exampleItems, series, seriesOrder, bodyText, colorName, bwName);
               return createCommitAndPushBatches(uploadTasks, md, mdPath, 'Update book: ' + title);
            });
            return chain;
          })`;
          
content = content.replace(oldPublishEditLoop, newPublishEditLoop);
fs.writeFileSync(path, content, 'utf8');
console.log('Script updated with batch logic.');
