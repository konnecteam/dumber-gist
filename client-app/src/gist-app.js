import {inject, computedFrom} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import {EditSession} from './edit/edit-session';
import {OpenedFiles} from './edit/opened-files';
import {combo} from 'aurelia-combo';
import _ from 'lodash';

const MIN_PANEL_WIDTH = 150;
const MIN_DEV_TOOLS_HEIGHT = 40;

// Handle layout calculation and global bundling state
@inject(EventAggregator, DndService, EditSession, OpenedFiles)
export class GistApp {
  showSideBarInSmallLayout = false;
  showEditorsInSmallLayout = true;
  showBrowserWindowInSmallLayout = true;

  isBundling = false;
  bundlerError = null;
  intention = {sideBar: 0, editors: 0, devTools: 0};

  sideBarWidth = 400;
  editorsWidth = 500;
  devToolsHeight = 0;
  windowWidth = null;
  windowHeight = null;

  constructor(ea, dndService, session, openedFiles) {
    this.ea = ea;
    this.dndService = dndService;
    this.session = session;
    this.openedFiles = openedFiles;
    this.onResize = _.debounce(this.onResize.bind(this), 100);
    this.onResize();
    this._onResize = this._onResize.bind(this);
  }

  attached() {
    this.dndService.addTarget(this);
    this._subscribers = [
      this.ea.subscribe('dnd:willStart', () => this.resetIntention()),
      this.ea.subscribe('dnd:didEnd', () => {
        if (this.intention.sideBar) this.sideBarWidth += this.intention.sideBar;
        if (this.intention.editors) this.editorsWidth += this.intention.editors;
        if (this.intention.devTools) this.devToolsHeight += this.intention.devTools;
        this.resetIntention();
      }),
      this.ea.subscribe('opened-file', () => {
        this.showSideBarInSmallLayout = false;
        this.showEditorsInSmallLayout = true;
        if (this.windowWidth <= 450) {
          this.showBrowserWindowInSmallLayout = false;
        }
      })
    ];
    window.addEventListener('resize', this._onResize);
  }

  async bundle() {
    if (this.isBundling) return;
    if (this.session.isRendered) return;

    this.isBundling = true;
    this.bundlerError = null;

    try {
      await this.session.render();
    } catch (e) {
      this.bundlerError = e.message;
    }

    this.isBundling = false;
  }

  detached() {
    this.dndService.removeTarget(this);
    this._subscribers.forEach(s => s.dispose());
    window.removeEventListener('resize', this._onResize);
  }

  _onResize() {
    this.onResize();
  }

  onResize(reset) {
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (width < 320) {
      width = 320;
    }

    if (height < 200) {
      height = 200;
    }

    if (this.windowWidth && !reset) {
      this.sideBarWidth = Math.round(this.sideBarWidth / this.windowWidth * width);
      this.editorsWidth = Math.round(this.editorsWidth / this.windowWidth * width);
      this.devToolsHeight = Math.round(this.devToolsHeight / this.windowHeight * height);
    } else if (width >= 800) {
      this.sideBarWidth = Math.round(.2 * width);
      this.editorsWidth = Math.round(.4 * width);
    } else {
      this.sideBarWidth = Math.round(.2 * width);
      this.editorsWidth = Math.round(.5 * width);
    }

    if (width <= 450 && this.showEditorsInSmallLayout) {
      this.showBrowserWindowInSmallLayout = false;
    }

    this.windowWidth = width;
    this.windowHeight = height;
  }

  resetIntention() {
    this.intention.sideBar = 0;
    this.intention.editors = 0;
    this.intention.devTools = 0;
  }

  dndCanDrop(model) {
    return model.type === 'resize-panel';
  }

  _buildIntension(location) {
    const intention = {sideBar: 0, editors: 0, devTools: 0};
    const {mouseStartAt, mouseEndAt} = location;
    const diff = mouseEndAt.x - mouseStartAt.x;
    const diffY = mouseStartAt.y - mouseEndAt.y;

    if (this.dnd.model.panel === 'side-bar') {
      let newWidth = this.sideBarWidth + diff;
      if (newWidth < MIN_PANEL_WIDTH) {
        newWidth = MIN_PANEL_WIDTH;
      } else if (newWidth > this.windowWidth - 2 * MIN_PANEL_WIDTH) {
        newWidth = this.windowWidth - 2 * MIN_PANEL_WIDTH;
      }
      const effetiveDiff = newWidth - this.sideBarWidth;
      intention.sideBar = effetiveDiff;

      let newWidth2 = this.editorsWidth - effetiveDiff;
      if (newWidth2 < MIN_PANEL_WIDTH) newWidth2 = MIN_PANEL_WIDTH;
      intention.editors = newWidth2 - this.editorsWidth;
    } else if (this.dnd.model.panel === 'editors') {
      let newWidth = this.editorsWidth + diff;
      if (newWidth < MIN_PANEL_WIDTH) {
        newWidth = MIN_PANEL_WIDTH;
      } else {
        if (this.windowWidth >= 800) {
          if (newWidth > this.windowWidth - MIN_PANEL_WIDTH - this.sideBarWidth) {
            newWidth = this.windowWidth - MIN_PANEL_WIDTH - this.sideBarWidth;
          }
        } else {
          if (newWidth > this.windowWidth - MIN_PANEL_WIDTH) {
            newWidth = this.windowWidth - MIN_PANEL_WIDTH;
          }
        }
      }
      intention.editors = newWidth - this.editorsWidth;
    } else if (this.dnd.model.panel === 'dev-tools') {
      let newHeight = this.devToolsHeight + diffY;

      if (newHeight > this.windowHeight - 150) {
        newHeight = this.windowHeight - 150;
      }

      if (newHeight < MIN_DEV_TOOLS_HEIGHT) {
        newHeight = 0;
      }

      intention.devTools = newHeight - this.devToolsHeight;
    }

    return intention;
  }

  dndHover(location) {
    const intention = this._buildIntension(location);
    if (this.intention.sideBar !== intention.sideBar) this.intention.sideBar = intention.sideBar;
    if (this.intention.editors !== intention.editors) this.intention.editors = intention.editors;
    if (this.intention.devTools !== intention.devTools) this.intention.devTools = intention.devTools;
  }

  dndDrop() {
  }

  toggleEditors() {
    this.showEditorsInSmallLayout = !this.showEditorsInSmallLayout;
    if (!this.showEditorsInSmallLayout) {
      this.showBrowserWindowInSmallLayout = true;
    } else if (this.windowWidth <= 450) {
      this.showBrowserWindowInSmallLayout = false;
    }
  }

  toggleBrowserWindow() {
    this.showBrowserWindowInSmallLayout = !this.showBrowserWindowInSmallLayout;
    if (!this.showBrowserWindowInSmallLayout) {
      this.showEditorsInSmallLayout = true;
    } else if (this.windowWidth <= 450) {
      this.showEditorsInSmallLayout = false;
    }
  }

  toggleDevTools() {
    if (this.devToolsHeight) {
      this.devToolsHeight = 0;
    } else {
      this.devToolsHeight = 200;
    }
  }

  // TODO test ctrl-w in Win10 Chrome
  @combo('ctrl+w')
  closeActiveTab(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    const {editingFile} = this.openedFiles;
    if (editingFile) {
      this.ea.publish('close-file', editingFile.filename);
    }
  }

  @computedFrom('sideBarWidth', 'intention.sideBar')
  get effectiveSideBarWidth() {
    const width = this.sideBarWidth + this.intention.sideBar;
    return width;
  }

  @computedFrom('editorsWidth', 'intention.editors')
  get effectiveEditorsWidth() {
    const width = this.editorsWidth + this.intention.editors;
    return width;
  }

  @computedFrom('devToolsHeight', 'intention.devTools')
  get effectiveDevToolsHeight() {
    const hight = this.devToolsHeight + this.intention.devTools;
    return hight;
  }
}