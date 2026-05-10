const fs = require('fs');

const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

// The logic needs to be changed:
// Instead of creating one giant tree and one commit at the end, 
// we will iterate through the files, upload each blob, create a new tree based on the CURRENT head tree,
// create a commit, and advance the branch head. This prevents "Payload too large" and Tree timeout issues 
// by breaking the giant upload/commit into small sequential commits.

const newScript = `
      function createCommitAndPushSequential(ctx, fileEntries, mdContent, mdPath, commitMsgPrefix) {
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
      }
`;

console.log('Script built.');
