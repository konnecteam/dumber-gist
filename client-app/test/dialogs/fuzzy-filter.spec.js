import test from 'tape-promise/tape';
import {fuzzyFilter} from '../../src/dialogs/fuzzy-filter';

test('fuzzyFilter returns original list', t => {
  t.deepEqual(
    fuzzyFilter('', ['foo', 'bar', 'lo']),
    [['foo'], ['bar'], ['lo']]
  );
  t.end();
});

test('fuzzyFilter returns sorted filtered list', t => {
  t.deepEqual(
    fuzzyFilter('o', ['foo', 'bar', 'lo']),
    [['l', 'o'], ['f', 'o', 'o']]
  );
  t.end();
});

test('fuzzyFilter returns sorted filtered list, case2', t => {
  const list = ['package.json', 'src/main.js', 'src/app.html', 'src/app.js', 'index.html'];
  t.deepEqual(
    fuzzyFilter(' aj ', list),
    [
      ['p', 'a', 'ckage.', 'j', 'son'],
      ['src/m', 'a', 'in.', 'j', 's'],
      ['src/', 'a', 'pp.', 'j', 's']
    ]
  );
  t.end();
});

test('fuzzyFilter returns sorted filtered list, case3', t => {
  const list = ['package.json', 'src/main.js', 'src/app.html', 'src/app.js', 'index.html'];
  t.deepEqual(
    fuzzyFilter('smain', list),
    [
      ['', 's', 'rc/', 'main', '.js'],
    ]
  );
  t.end();
});

test('fuzzyFilter returns sorted filtered list, case4', t => {
  const list = ['package.json', 'src/main.js', 'src/app.html', 'src/app.js', 'index.html'];
  t.deepEqual(
    fuzzyFilter('js', list),
    [
      ['src/main.', 'js'],
      ['src/app.', 'js'],
      ['package.', 'js', 'on']
    ]
  );
  t.end();
});
