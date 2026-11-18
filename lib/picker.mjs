import { emitKeypressEvents } from 'node:readline';

export function pick(items, { title, initial = [], multiple = false,
  input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY) {
    throw Error('Interactive terminal required. Run smv install --profile NAME --yes or pass explicit tool IDs.');
  }
  const selected = new Set(initial);
  let query = '', filtering = false, cursor = 0, visible = items;
  const raw = input.isRaw;
  const flowing = input.readableFlowing;
  emitKeypressEvents(input);

  return new Promise((resolve, reject) => {
    function finish(value, error) {
      input.removeListener('keypress', onKey);
      input.removeListener('end', onEnd);
      output.removeListener('resize', render);
      input.setRawMode(Boolean(raw));
      if (!flowing) input.pause();
      output.write('\x1b[?25h\x1b[?1049l');
      if (error) reject(error);
      else resolve(value);
    }
    function render() {
      visible = items.filter(item => `${item.id} ${item.label}`.toLowerCase().includes(query.toLowerCase()));
      cursor = Math.max(0, Math.min(cursor, visible.length - 1));
      const size = Math.max(1, Math.min(14, (output.rows || 24) - 7));
      const start = Math.max(0, Math.min(cursor - Math.floor(size / 2), visible.length - size));
      const rows = visible.slice(start, start + size).map((item, i) => {
        const box = multiple ? (selected.has(item.id) ? '[x] ' : '[ ] ') : '';
        return `${start + i === cursor ? '›' : ' '} ${box}${item.label}`;
      });
      const lines = [title, '↑/↓ Move  ' + (multiple ? 'Space Toggle  ' : '') + 'Enter Continue  / Filter  Esc Back',
        `Filter: ${query}${filtering ? '▏' : ''}`, ...rows,
        `${visible.length} matches${multiple ? ` · ${selected.size} selected` : ''}`];
      output.write('\x1b[H\x1b[2J' + lines.map(line => line.slice(0, Math.max(1, (output.columns || 80) - 1))).join('\r\n'));
    }
    function onEnd() { finish(null, Error('Setup cancelled.')); }
    function onKey(str, key = {}) {
      if (key.ctrl && key.name === 'c') return onEnd();
      if (key.name === 'escape') {
        if (!filtering && !query) return finish(null);
        filtering = false; query = ''; cursor = 0;
      } else if (key.name === 'up') cursor--;
      else if (key.name === 'down') cursor++;
      else if (key.name === 'return') {
        if (filtering) filtering = false;
        else if (multiple && selected.size) return finish([...selected]);
        else if (!multiple && visible[cursor]) return finish(visible[cursor].id);
      } else if (filtering && key.name === 'backspace') { query = query.slice(0, -1); cursor = 0; }
      else if (filtering && !key.ctrl && !key.meta && /^[ -~]$/.test(str || '')) { query += str; cursor = 0; }
      else if (str === '/') filtering = true;
      else if (str === ' ' && multiple && visible[cursor]) {
        const { id } = visible[cursor];
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
      }
      render();
    }
    input.setRawMode(true);
    output.write('\x1b[?1049h\x1b[?25l');
    input.on('keypress', onKey);
    input.once('end', onEnd);
    output.on('resize', render);
    input.resume();
    render();
  });
}
