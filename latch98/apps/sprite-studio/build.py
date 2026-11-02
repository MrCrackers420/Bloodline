"""Builds a fully offline, one-file index.html. Uses only the Python stdlib."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
text = (HERE / 'index.template.html').read_text(encoding='utf-8')
for marker, name in [('@INLINE_STYLE@', 'style.css'), ('@INLINE_MODEL@', 'model.js'), ('@INLINE_PNG@', 'png.js'), ('@INLINE_SHEET@', 'sheet.js'), ('@INLINE_APP@', 'app.js')]:
    data = (HERE / name).read_text(encoding='utf-8')
    # Do not let embedded source close the HTML script/style tag.
    text = text.replace('/* ' + marker + ' */', data.replace('</script', '<\\/script').replace('</style', '<\\/style'))
(HERE / 'index.html').write_text(text, encoding='utf-8')
print('Built offline index.html:', len(text), 'characters')
