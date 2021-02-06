/* jslint esversion: 6 */

/*
 * Copyright 2019 Abakkk
 *
 * This file is part of Keypad Tiling, a tiling extension for GNOME Shell.
 * https://framagit.org/abakkk/KeypadTiling
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const AltTab = imports.ui.altTab;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const SwitcherPopup = imports.ui.switcherPopup;

const Convenience = ExtensionUtils.getSettings ? ExtensionUtils : ExtensionUtils.getCurrentExtension().imports.convenience;

const GS_VERSION = Config.PACKAGE_VERSION;

// information: Meta.MaximizeFlags = { HORIZONTAL: 1, VERTICAL: 2, BOTH: 3 }

const SWITCHER_NO_MODS_TIMEOUT = 4500;
const WINDOW_OPERATION_TIMEOUT = 50;
const KEYBINDINGS = {
    'kpdivide': function() { kp(_kpdivide); },
    'kp0': function() { kp(_kp0); },
    'kp1': function() { kp(_kp1); },
    'kp2': function() { kp(_kp2); },
    'kp3': function() { kp(_kp3); },
    'kp4': function() { kp(_kp4); },
    'kp5': function() { kp(_kp5); },
    'kp6': function() { kp(_kp6); },
    'kp7': function() { kp(_kp7); },
    'kp8': function() { kp(_kp8); },
    'kp9': function() { kp(_kp9); },
    'popup-kp1': function() { popupKp(_kp1, _kp7); },
    'popup-kp2': function() { popupKp(_kp2, _kp8); },
    'popup-kp3': function() { popupKp(_kp3, _kp9); },
    'popup-kp4': function() { popupKp(_kp4, _kp6); },
    'popup-kp6': function() { popupKp(_kp6, _kp4); },
    'popup-kp7': function() { popupKp(_kp7, _kp1); },
    'popup-kp8': function() { popupKp(_kp8, _kp2); },
    'popup-kp9': function() { popupKp(_kp9, _kp3); }
};

let settings, interfaceSettings, animationSettingIsChanged, animationSettingWasDefault, isWaylandCompositor;

function init() {
    
}

function enable() {
    isWaylandCompositor = Meta.is_wayland_compositor();
    Meta.Window.prototype.move_then_resize_frame = move_then_resize_frame;
    
    settings = Convenience.getSettings();
    interfaceSettings = Convenience.getSettings('org.gnome.desktop.interface');
    
    for (let key in KEYBINDINGS)
        Main.wm.addKeybinding(key,
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            KEYBINDINGS[key]
        );
}

function disable() {
    for (let key in KEYBINDINGS)
        Main.wm.removeKeybinding(key);
    
    enableAnimations();
    
    settings = undefined;
    interfaceSettings = undefined;
    
    delete Meta.Window.prototype.move_then_resize_frame;
}

function kp(kpFunction) {
    let window = global.display.focus_window;
    if (window && window.resizeable) {
        disableAnimations();
        kpFunction(window);
        addTimeout(3, () => enableAnimations());
    }
}

function popupKp(firstKpFunction, secondKpFunction) {
    let window = global.display.focus_window;
    if (!window || !window.resizeable)
        return;
    
    disableAnimations();
    
    let workspace = global.workspace_manager ? global.workspace_manager.get_active_workspace() : global.screen.get_active_workspace();
    let otherWindows = AltTab.getWindows(workspace).filter(w => w != window && w.resizeable);
    if (otherWindows.length != 0) {
        let tabPopup = new KeypadTilingWindowSwitcherPopup(window, firstKpFunction, secondKpFunction);
        if (!tabPopup.show(false, 'switch-applications', 0))
            tabPopup.destroy();
    } else {
        firstKpFunction(window);
        enableAnimations();
    }
}

function disableAnimations() {
    if (!settings.get_boolean('disable-animations'))
        return;
    
    if (interfaceSettings.get_boolean('enable-animations')) {
        animationSettingWasDefault = !(interfaceSettings.get_user_value('enable-animations') && true);
        interfaceSettings.set_boolean('enable-animations', false);
        animationSettingIsChanged = true;
    }
}

function enableAnimations() {
    if (!animationSettingIsChanged)
        return;
    
    if (animationSettingWasDefault)
        interfaceSettings.reset('enable-animations');
    else
        interfaceSettings.set_boolean('enable-animations', true);
    
    animationSettingIsChanged = undefined;
    animationSettingWasDefault = undefined;
}

function move_then_resize_frame(userOp, x, y , width, height) {
    // Decompose move_resize_frame on Wayland
    if (isWaylandCompositor)
        this.move_frame(userOp, x, y);
    
    this.move_resize_frame(userOp, x, y, width, height);
    
    // Workaround for GNOME Terminal 3.38+
    this.move_frame(userOp, x, y);
}

function addTimeout(i, callback) {
    // Wayland needs a delay between each operation (move or resize) on windows :/
    if (isWaylandCompositor)
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, i * WINDOW_OPERATION_TIMEOUT, () => {
            callback();
            return GLib.SOURCE_REMOVE;
        });
    else
        callback();
}

function getIsTiled(curRect, maxRect) {
    let tiledXValues = [maxRect.x, maxRect.x + Math.floor(maxRect.width/2), maxRect.x + Math.ceil(maxRect.width/2)];
    let tiledYValues = [maxRect.y, maxRect.y + Math.floor(maxRect.height/2), maxRect.y + Math.ceil(maxRect.height/2)];
    let tiledWidthValues = [maxRect.width, Math.floor(maxRect.width/2), Math.ceil(maxRect.width/2)];
    let tiledHeightValues = [maxRect.height, Math.floor(maxRect.height/2), Math.ceil(maxRect.height/2)];
    
    return tiledXValues.includes(curRect.x) &&
           tiledYValues.includes(curRect.y) &&
           tiledWidthValues.includes(curRect.width) &&
           tiledHeightValues.includes(curRect.height);
}

function saveRect(window, curRect, maxRect) {
    if (window.maximized_horizontally && window.maximized_vertically && !window.nonTiledRect) {
        window.unmaximize(Meta.MaximizeFlags.BOTH);
        window.nonTiledRect = window.get_frame_rect();
        window.maximize(Meta.MaximizeFlags.BOTH);
        return;
    }
    
    let isTiled = getIsTiled(curRect, maxRect);
    if (!isTiled)
        window.nonTiledRect = curRect;
}

function _kpdivide(window) {
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    if (window.can_maximize())
        window.maximize(Meta.MaximizeFlags.BOTH);
}

function _kp0(window) {
    if (!window.minimized && window.can_minimize())
        window.minimize();
}

function _kp1(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
    if (maximizedFlag) {
        window.unmaximize(maximizedFlag);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x, maxRect.y + maxRect.height/2, maxRect.width/2, maxRect.height/2));
}

function _kp2(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    if (window.maximized_vertically) {
        window.unmaximize(Meta.MaximizeFlags.VERTICAL);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, curRect.x, maxRect.y + maxRect.height/2, curRect.width, maxRect.height/2));
    i++;
    
    addTimeout(i, () => window.maximize(Meta.MaximizeFlags.HORIZONTAL));
}

function _kp3(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
    if (maximizedFlag) {
        window.unmaximize(maximizedFlag);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x + maxRect.width/2, maxRect.y + maxRect.height/2, maxRect.width/2, maxRect.height/2));
}

function _kp4(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    if (window.maximized_horizontally) {
        window.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x, curRect.y, maxRect.width/2, curRect.height));
    i++;
    
    addTimeout(i, () => window.maximize(Meta.MaximizeFlags.VERTICAL));
}

function _kp5(window) {
    let i = 0;
    let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    let isTiled = getIsTiled(curRect, maxRect);
    
    if (!maximizedFlag && !isTiled) {
        _kpdivide(window);
        return;
    }
    
    if (maximizedFlag) {
        window.unmaximize(maximizedFlag);
        i++;
    }
    
    if (isTiled && window.nonTiledRect) {
        addTimeout(i, () => {
            let oldRect = window.nonTiledRect;
            window.move_then_resize_frame(true, oldRect.x, oldRect.y, oldRect.width, oldRect.height);
            delete window.nonTiledRect;
        });
        i++;
    }
    
    if (settings.get_boolean('center-when-unmaximizing')) {
        addTimeout(i, () => {
            curRect = window.get_frame_rect();
            window.move_frame(true, (maxRect.width - curRect.width)/2, (maxRect.height - curRect.height)/2);
        });
    }
}

function _kp6(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    if (window.maximized_horizontally) {
        window.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x + maxRect.width/2, curRect.y, maxRect.width/2, curRect.height));
    i++;
    
    addTimeout(i, () => window.maximize(Meta.MaximizeFlags.VERTICAL));
}

function _kp7(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
    if (maximizedFlag) {
        window.unmaximize(maximizedFlag);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x, maxRect.y, maxRect.width/2, maxRect.height/2));
}

function _kp8(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    if (window.maximized_vertically) {
        window.unmaximize(Meta.MaximizeFlags.VERTICAL);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, curRect.x, maxRect.y, curRect.width, maxRect.height/2));
    i++;
    
    addTimeout(i, () => window.maximize(Meta.MaximizeFlags.HORIZONTAL));
}

function _kp9(window) {
    let i = 0;
    let curRect = window.get_frame_rect();
    let maxRect = window.get_work_area_current_monitor();
    saveRect(window, curRect, maxRect);
    
    let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
    if (maximizedFlag) {
        window.unmaximize(maximizedFlag);
        i++;
    }
    
    addTimeout(i, () => window.move_then_resize_frame(true, maxRect.x + maxRect.width/2, maxRect.y, maxRect.width/2, maxRect.height/2));
}


var WindowSwitcherPopupWrapper = GS_VERSION < '3.36.0' ?
class WindowSwitcherPopupWrapper extends AltTab.WindowSwitcherPopup { // GS 3.34-
    _keyPressEvent(actor, event) {
        let keysym = event.get_key_symbol();
        if (keysym == 65293 || keysym == 65421) {
            this._isActivated = true;
            if (this.fadeAndDestroy) // GS 3.32+
                this.fadeAndDestroy();
            else
                this.destroy();
            return true; // Clutter.EVENT_STOP
        }
        
        return super._keyPressEvent(actor, event);
    }
} :
class WindowSwitcherPopupWrapper extends AltTab.WindowSwitcherPopup { // GS 3.36+
    vfunc_key_press_event(keyEvent) {
        let keysym = keyEvent.keyval;
        if (keysym == 65293 || keysym == 65421) {
            this._isActivated = true;
            this.fadeAndDestroy();
            return true; // Clutter.EVENT_STOP
        }
        
        return super.vfunc_key_press_event(keyEvent);
    }
};

// GS 3.32+
if (AltTab.WindowSwitcherPopup.prototype instanceof GObject.Object)
    WindowSwitcherPopupWrapper = GObject.registerClass(WindowSwitcherPopupWrapper);

var KeypadTilingWindowSwitcherPopup = class KeypadTilingWindowSwitcherPopup extends WindowSwitcherPopupWrapper {
    _init(firstWindow, firstCallback, secondCallback) {
        this._increment = 0;
        this._saveWindow(firstWindow);
        addTimeout(this._increment, () => firstCallback(firstWindow));
        this._increment = this._increment + 2;
        
        this._firstWindow = firstWindow;
        this._callback = secondCallback;
        super._init();
        
        this._noModsTimeoutOld = SwitcherPopup.NO_MODS_TIMEOUT;
        SwitcherPopup.NO_MODS_TIMEOUT = SWITCHER_NO_MODS_TIMEOUT;
    }
    
    _getWindowList() {
        let workspace = global.workspace_manager ? global.workspace_manager.get_active_workspace() : global.screen.get_active_workspace();
        let windows = AltTab.getWindows(workspace).filter(window => window != this._firstWindow && window.resizeable);
        
        windows.forEach(window => {
            addTimeout(this._increment, () => this._saveWindow(window));
            addTimeout(this._increment, () => this._callback(window));
            this._increment = this._increment + 2;
        });
        
        return windows;
    }
    
    _itemActivated(switcher, n) {
        this._isActivated = true;
        super._itemActivated(switcher, n);
    }
    
    _restoreWindow(window) {
        if (!window.rectOld)
            return;
        
        window.unmaximize(Meta.MaximizeFlags.BOTH);
        
        addTimeout(1, () => {
            window.move_then_resize_frame(true, window.rectOld.x, window.rectOld.y, window.rectOld.width, window.rectOld.height);
            delete window.rectOld;
        });
        
        if (window.maximizedFlagOld)
            addTimeout(2, () => {
                window.maximize(window.maximizedFlagOld);
                delete window.maximizedFlagOld;
            });
        else
            delete window.maximizedFlagOld;
    }
    
    _saveWindow(window) {
        let maximizedFlag = (window.maximized_horizontally | 0) | 2*(window.maximized_vertically | 0);
        if (maximizedFlag) {
            window.unmaximize(maximizedFlag);
            this._increment ++;
        }
        
        window.maximizedFlagOld = maximizedFlag;
        window.rectOld = window.get_frame_rect();
    }
    
    _select(num) {
        super._select(num);
        
        let window = this._items[this._selectedIndex].window;
        let time = global.get_current_time();
        window.activate(time);
    }
    
    _onDestroy() {
        SwitcherPopup.NO_MODS_TIMEOUT = this._noModsTimeoutOld;
        
        if (this._switcherList) {
            let windows = this._switcherList.windows;
            let selectedWindow = this._items[this._selectedIndex].window;
            
            let windowsToRestore = this._isActivated ?
                                   windows.filter(window => window != selectedWindow) :
                                   windows.concat([this._firstWindow]);
            windowsToRestore.forEach(this._restoreWindow.bind(this));
        }
        
        let time = global.get_current_time();
        this._firstWindow.activate(time);
        
        addTimeout(3, () => enableAnimations());
        
        super._onDestroy();
    }
};

// GS 3.32+
if (WindowSwitcherPopupWrapper.prototype instanceof GObject.Object)
    KeypadTilingWindowSwitcherPopup = GObject.registerClass(KeypadTilingWindowSwitcherPopup);


