const fs = require('fs');
const path = 'src/pages/admin.astro';
let content = fs.readFileSync(path, 'utf8');

// I accidentally deleted the event listener for publishBtn when rewriting the publish functions.
const clickHandler = `
      /* ── Publish dispatcher ── */

      el.publishBtn.addEventListener('click', function () {
        var title = el.title.value.trim();
        var author = el.author.value.trim();
        var series = el.series.value.trim();
        var seriesOrder = el.seriesOrder.value.trim();
        var bodyText = el.bodyText.value;
        var slug = slugify(title);
        if (!slug) return;

        showOverlay(editMode === 'edit' ? 'Сохранение изменений' : 'Публикация книги');

        if (editMode === 'edit') {
          publishEdit(title, author, series, seriesOrder, bodyText, slug);
        } else {
          publishCreate(title, author, series, seriesOrder, bodyText, slug);
        }
      });
`;

// Inject right before /* ── Delete ── */
content = content.replace('      /* ── Delete ── */', clickHandler + '\n      /* ── Delete ── */');

fs.writeFileSync(path, content, 'utf8');
