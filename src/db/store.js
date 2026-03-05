/**
 * Simple JSON file-based store
 * Each collection is a JSON file in the data directory.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

class JsonStore {
  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _filePath(collection) {
    return path.join(DATA_DIR, `${collection}.json`);
  }

  _read(collection) {
    const fp = this._filePath(collection);
    if (!fs.existsSync(fp)) return [];
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  }

  _write(collection, data) {
    fs.writeFileSync(this._filePath(collection), JSON.stringify(data, null, 2));
  }

  findAll(collection, filter = {}) {
    let items = this._read(collection);
    for (const [key, value] of Object.entries(filter)) {
      items = items.filter(item => item[key] === value);
    }
    return items;
  }

  findById(collection, id) {
    return this._read(collection).find(item => item.id === id) || null;
  }

  insert(collection, doc) {
    const items = this._read(collection);
    items.push(doc);
    this._write(collection, items);
    return doc;
  }

  update(collection, id, updates) {
    const items = this._read(collection);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    this._write(collection, items);
    return items[idx];
  }

  delete(collection, id) {
    const items = this._read(collection);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    this._write(collection, items);
    return true;
  }

  count(collection, filter = {}) {
    return this.findAll(collection, filter).length;
  }
}

module.exports = new JsonStore();
