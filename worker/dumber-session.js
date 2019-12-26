import _ from 'lodash';
import path from 'path';

export const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
<html>
<head>
<title>App</title>
</head>
<body>
<h1>Please create an index.html file to render</h1>
</body>
</html>
`;

export const DEFAULT_BUNDLE_JS = `
var m = document.createElement('h1');
m.textContent = 'Error: /dist/entry-bundle.js is not ready.';
document.body.appendChild(m);
`;

export class DumberUninitializedError extends Error {
  constructor() {
    super('dumber instance is not initialized!')
  }
}

export class DumberSession {
  constructor(Dumber, auFindDeps, serviceCache) {
    this.Dumber = Dumber;
    this.auFindDeps = auFindDeps;
    this.instance = null;
    this.config = null;
    this.serviceCache = serviceCache;
  }

  get isInitialised() {
    return !!this.instance;
  }

  async init(config, dumberCache) {
    await this.serviceCache.reset();
    console.log('stub index.html and entry-bundle.js');
    await this.serviceCache.put(
      '/',
      DEFAULT_INDEX_HTML,
      'text/html; charset=utf-8'
    );
    await this.serviceCache.put(
      '/dist/entry-bundle.js',
      DEFAULT_BUNDLE_JS,
      'application/javascript'
    );

    if (this.instance && _.isEqual(this.config, config)) {
      // reuse existing dumber
      console.log('Reuse dumber instance');
      return {isNew: false};
    }

    // TODO resolve config.deps using https://github.com/stackblitz/core/tree/master/turbo-resolver

    this.config = config;
    this.instance = new this.Dumber({
      skipModuleLoader: true,
      depsFinder: config.isAurelia1 ? this.auFindDeps : undefined,
      // Cache is implemented in main window.
      // Because we want to share cache on domain gist-code.com
      // for all instance of ${app-id}.gist-code.com
      cache: dumberCache,
      prepend: ['https://cdn.jsdelivr.net/npm/dumber-module-loader@1.0.0/dist/index.min.js'],
      deps: [
        {name: 'vue', main: 'dist/vue.js', lazyMain: true}
      ]
    });
    console.log('Created dumber instance');
    return {isNew: true};
  }

  async update(files) {
    if (!this.isInitialised) {
      throw new DumberUninitializedError();
    }

    for (let i = 0, ii = files.length; i < ii; i++) {
      const file = files[i];
      if (file.filename.startsWith('src/') || !file.filename.match(/[^/]+\.html/)) {
        console.log('capture ' + file.filename);
        let moduleId = path.relative('src', file.filename);
        if (moduleId.endsWith('.js')) moduleId = moduleId.slice(0, -3);
        await this.instance.capture({
          path: file.filename,
          moduleId,
          contents: file.content
        });
      } else {
        let wantedPath = file.filename;
        if (wantedPath === 'index.html') {
          wantedPath = '';
        }

        await this.serviceCache.put(
          '/' + wantedPath,
          file.content,
          file.filename.endsWith('.html') ? 'text/html; charset=utf-8': 'text/plain'
        );
        console.log('Cached /' + wantedPath);
      }
    }
  }

  async build() {
    if (!this.isInitialised) {
      throw new DumberUninitializedError();
    }

    await this.instance.resolve();
    const bundles = await this.instance.bundle();
    // only use single bundle
    const bundle = bundles['entry-bundle'];
    const all = [];

    bundle.files.forEach(f => all.push(f.contents));
    all.push('requirejs.config(' + JSON.stringify(bundle.config, null , 2) + ');');

    await this.serviceCache.put(
      '/dist/entry-bundle.js',
      all.join('\n'),
      'application/javascript'
    );
    console.log('Done build!');
  }
}