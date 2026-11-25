import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { APP_VERSION } from '../js/core.js';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('keeps release versions aligned', () => {
    const packageJson = JSON.parse(read('package.json'));
    assert.equal(packageJson.version, APP_VERSION);
    assert.equal(read('VERSION').trim(), APP_VERSION);
    assert.match(read('CHANGELOG.md'), new RegExp(`## ${APP_VERSION.replaceAll('.', '\\.')}`));
});

test('ships every local asset referenced by index.html', () => {
    const html = read('index.html');
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => match[1].split('?')[0])
        .filter((path) => !/^(?:https?:)?\/\//.test(path) && !path.startsWith('#'));
    const missing = references.filter((path) => !existsSync(resolve(root, path)));
    assert.deepEqual(missing, []);
});

test('does not contain duplicate static HTML ids', () => {
    const ids = [...read('index.html').matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(duplicates, []);
});

test('keeps advertising disabled without a valid configuration', () => {
    const html = read('index.html');
    const ads = read('js/ads.js');
    assert.match(html, /data-ad-slot="" hidden/);
    assert.match(ads, /if \(!config\.enabled/);
    assert.match(ads, /CLIENT_PATTERN\.test/);
    assert.doesNotMatch(html, /ca-pub-\d+/);
});

test('requires versioned terms and privacy agreement before sign-in', () => {
    const app = read('app.js');
    assert.match(app, /AGREEMENT_VERSIONS/);
    assert.match(app, /acceptedAt:\s*serverTimestamp\(\)/);
    assert.match(app, /if \(!hasCurrentLocalAgreement\(\)\)/);
    assert.match(app, /profileSnapshot\.data\(\)\?\.agreement/);
});

test('uses server timestamps and includes the route marker implementation', () => {
    const app = read('app.js');
    assert.match(app, /createdAt:\s*serverTimestamp\(\)/);
    assert.match(app, /updatedAt:\s*serverTimestamp\(\)/);
    assert.match(app, /function createRouteButton\(/);
    assert.match(app, /function drawRoutePreview\(/);
    assert.doesNotMatch(app, /drawRouteAndInfoButton\(/);
    assert.match(app, /lastCenteredTripKey === centerKey/);
});

test('preserves trip ownership and restricts membership updates in rules', () => {
    const rules = read('firestore.rules');
    assert.match(rules, /request\.resource\.data\.owner == resource\.data\.owner/);
    assert.match(rules, /resource\.data\.owner in request\.resource\.data\.members/);
    assert.match(rules, /keepsMembers\(\) \|\| ownerUpdatesMembers\(\)/);
    assert.match(rules, /request\.resource\.data\.members\.size\(\) == 1/);
    assert.match(rules, /match \/userAgreements\/\{userId\}/);
    assert.match(rules, /allow get, create, update: if signedIn\(\) && request\.auth\.uid == userId/);
    assert.match(rules, /allow list, delete: if false/);
});

test('does not ship private keys or repository access tokens', () => {
    const files = [];
    const visit = (directory) => {
        for (const entry of readdirSync(directory)) {
            if (entry === '.git' || entry === 'node_modules') continue;
            const path = resolve(directory, entry);
            if (path === resolve(root, 'config.local.js')) continue;
            if (statSync(path).isDirectory()) visit(path);
            else if (statSync(path).size < 1_000_000) files.push(path);
        }
    };
    visit(root);
    const forbidden = new RegExp([
        '-----BEGIN ', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY-----',
        '|gh', '[pousr]_[0-9A-Za-z]{20,}',
        '|AK', 'IA[0-9A-Z]{16}',
        '|AI', 'za[0-9A-Za-z_-]{30,}',
        '|OPENWEATHER_API_KEY', '\\s*:\\s*["\'][a-fA-F0-9]{25,}["\']',
    ].join(''));
    const findings = files.filter((path) => forbidden.test(readFileSync(path, 'utf8')));
    assert.deepEqual(findings, []);
});

test('keeps production settings out of a public checkout', () => {
    assert.equal(existsSync(resolve(root, 'CNAME')), false, 'The retired custom domain must not be configured');
    assert.equal(existsSync(resolve(root, 'config.js')), false, 'Production config must not be tracked');
    assert.match(read('.gitignore'), /^\/config\.local\.js$/m);
    assert.match(read('config.example.js'), /GOOGLE_API_KEY:\s*['"]{2}/);
    assert.match(read('index.html'), /id="local-config-notice"/);
});
