import fs from 'node:fs';
import assert from 'node:assert/strict';
const routes = JSON.parse(fs.readFileSync('content/routes.json', 'utf8'));
const audit = JSON.parse(fs.readFileSync('docs/photo-migration.json', 'utf8'));
assert.equal(routes.length, 27);
for (const route of routes) {
  const page = JSON.parse(fs.readFileSync(`content/pages/${route.key}.json`, 'utf8'));
  assert(!page.html.includes('Image placeholder'), `Placeholder in ${route.key}`);
  assert(!/<script\b/i.test(page.html), `Source runtime in ${route.key}`);
  assert(!page.html.includes('src="https://static.wixstatic.com'), `Remote photo in ${route.key}`);
  assert(!page.html.includes('href="#/'), `Hash navigation in ${route.key}`);
  for (const match of page.html.matchAll(/__BASE__\/(media|fonts)\/([^"\s<;&]+)/g)) {
    assert(fs.existsSync(`public/${match[1]}/${match[2]}`), `Missing asset: ${match[0]}`);
  }
}
for (const page of audit.pages) assert.equal(page.unmatchedPlaceholders.length, 0, page.page);
for (const asset of audit.assets) assert(fs.existsSync(asset.path) && fs.statSync(asset.path).size > 0 && !asset.error, asset.path);
const centers = audit.pages.filter((page) => page.title.includes('Center |') || page.title.includes('Center |'));
console.log(`Validated ${routes.length} pages, ${audit.assets.length} copied assets, and no unmatched image placeholders.`);
