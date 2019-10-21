import {bindable, computedFrom} from 'aurelia-framework';
import path from 'path';

export class FileIcon {
  @bindable filename;

  @computedFrom('filename')
  get faIcon() {
    const {filename} = this;
    if (!filename) return 'fas fa-file';
    const ext = path.extname(filename);
    if (ext === '.html') return 'fab fa-html5 text-warning';
    if (ext === '.js' || ext === '.ts') return 'fas fa-file-code text-warning';
    if (ext === '.css' || ext === '.scss' || ext === '.less') return 'fab fa-css3 text-primary';
    if (ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.ico') return 'fas fa-image text-success';
    return 'fas fa-file';
  }
}