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

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Convenience = ExtensionUtils.getSettings && ExtensionUtils.initTranslations ? ExtensionUtils : Me.imports.convenience;
const Metadata = Me.metadata;
const _ = imports.gettext.domain(Me.metadata["gettext-domain"]).gettext;
const _GSDS = imports.gettext.domain('gsettings-desktop-schemas').gettext;
const _GTK = imports.gettext.domain('gtk30').gettext;

// GTypeName is not sanitized in GS 3.28-
const sanitizeGType = function(name) {
    return `Gjs_${name.replace(/@/gi, '_at_').replace(/[^a-z0-9+_-]/gi, '_')}`;
}

const MARGIN = 10;

var TILING_KEYBINDINGS = {
    'kpdivide': "Maximize window",
    'kp0': "Minimize window",
    'kp1': "Move window to bottom left corner",
    'kp2': "Move window to bottom edge of screen",
    'kp3': "Move window to bottom right corner",
    'kp4': "Move window to left side of screen",
    'kp5': "Toggle maximization state",
    'kp6': "Move window to right side of screen",
    'kp7': "Move window to top left corner",
    'kp8': "Move window to top edge of screen",
    'kp9': "Move window to top right corner"
};

var COMPLETION_KEYBINDINGS = {
    'popup-kp1': "Move window to bottom left corner",
    'popup-kp2': "Move window to bottom edge of screen",
    'popup-kp3': "Move window to bottom right corner",
    'popup-kp4': "Move window to left side of screen",
    'popup-kp6': "Move window to right side of screen",
    'popup-kp7': "Move window to top left corner",
    'popup-kp8': "Move window to top edge of screen",
    'popup-kp9': "Move window to top right corner"
};

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let topStack = new TopStack();
    let switcher = new Gtk.StackSwitcher({halign: Gtk.Align.CENTER, visible: true, stack: topStack});
    Mainloop.timeout_add(0, () => {
        let window = topStack.get_toplevel();
        window.resize(720,500);
        let headerBar = window.get_titlebar();
        headerBar.custom_title = switcher;
        return false;
    });
    
    topStack.show_all();
    return topStack;
}

var TopStack = new GObject.Class({
    Name: Me.uuid + '.TopStack',
    GTypeName: sanitizeGType(Me.uuid + '-TopStack'),
    Extends: Gtk.Stack,
    
    _init: function(params) {
        this.parent({ transition_type: 1, transition_duration: 500, expand: true });
        this.prefsPage = new PrefsPage();
        this.add_titled(this.prefsPage, 'prefs', _("Preferences"));
        this.aboutPage = new AboutPage();
        this.add_titled(this.aboutPage, 'about', _("About"));
    }
});

var AboutPage = new GObject.Class({
    Name: Me.uuid + '.AboutPage',
    GTypeName: sanitizeGType(Me.uuid + '-AboutPage'),
    Extends: Gtk.ScrolledWindow,

    _init: function(params) {
        this.parent();

        let vbox= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: MARGIN*3 });
        this.add(vbox);
        
        let name = "<b> " + _(Metadata.name) + "</b>";
        let version = _("Version %d").format(Metadata.version);
        let description = _(Metadata.description);
        let link = "<span><a href=\"" + Metadata.url + "\">" + Metadata.url + "</a></span>";
        let licenceName = _GTK("GNU General Public License, version 2 or later");
        let licenceLink = "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html";
        let licence = "<small>" + _GTK("This program comes with absolutely no warranty.\nSee the <a href=\"%s\">%s</a> for details.").format(licenceLink, licenceName) + "</small>";
        
        let aboutLabel = new Gtk.Label({ wrap: true, justify: 2, use_markup: true, label:
            name + "\n\n" + version + "\n\n" + description + "\n\n" + link + "\n\n" + licence + "\n" });
        
        vbox.add(aboutLabel);
        
        let creditBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 2*MARGIN });
        let leftBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        let rightBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        let leftLabel = new Gtk.Label({ wrap: true, valign: 1, halign: 2, justify: 1, use_markup: true, label: "<small>" + _GTK("Created by") + "</small>" });
        let rightLabel = new Gtk.Label({ wrap: true, valign: 1, halign: 1, justify: 0, use_markup: true, label: "<small><a href=\"https://framagit.org/abakkk\">Abakkk</a></small>" });
        leftBox.pack_start(leftLabel, false, false, 0);
        rightBox.pack_start(rightLabel, false, false, 0);
        creditBox.pack_start(leftBox, true, true, 5);
        creditBox.pack_start(rightBox, true, true, 5);
        vbox.add(creditBox);
        
        if (_("translator-credits") != "translator-credits" && _("translator-credits") != "") {
            leftBox.pack_start(new Gtk.Label(), false, false, 0);
            rightBox.pack_start(new Gtk.Label(), false, false, 0);
            leftLabel = new Gtk.Label({ wrap: true, valign: 1, halign: 2, justify: 1, use_markup: true, label: "<small>" + _GTK("Translated by") + "</small>" });
            rightLabel = new Gtk.Label({ wrap: true, valign: 1, halign: 1, justify: 0, use_markup: true, label: "<small>" + _("translator-credits") + "</small>" });
            leftBox.pack_start(leftLabel, false, false, 0);
            rightBox.pack_start(rightLabel, false, false, 0);
        }
    }
    
});

var PrefsPage = new GObject.Class({
    Name: Me.uuid + '.PrefsPage',
    GTypeName: sanitizeGType(Me.uuid + '-PrefsPage'),
    Extends: Gtk.ScrolledWindow,

    _init: function(params) {
        this.parent();

        this.settings = Convenience.getSettings();
        
        let box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin: MARGIN*3 });
        this.add(box);
        
        let listBox = new Gtk.ListBox({ selection_mode: 0, hexpand: true });
        box.add(listBox);
        
        let styleContext = listBox.get_style_context();
        styleContext.add_class('background');
        
        let animationsBox = new Gtk.Box({ margin: MARGIN });
        let animationsLabel = new Gtk.Label({label: _("Disable animations during tiling")});
        animationsLabel.set_halign(1);
        let animationsSwitch = new Gtk.Switch({valign: 3});
        this.settings.bind("disable-animations", animationsSwitch, "active", 0);
        animationsBox.pack_start(animationsLabel, true, true, 4);
        animationsBox.pack_start(animationsSwitch, false, false, 4);
        listBox.add(animationsBox);
        
        let centerBox = new Gtk.Box({ margin: MARGIN });
        let centerLabel = new Gtk.Label({label: _("Move window to center of screen when unmaximizing")});
        centerLabel.set_halign(1);
        let centerSwitch = new Gtk.Switch({valign: 3});
        this.settings.bind("center-when-unmaximizing", centerSwitch, "active", 0);
        centerBox.pack_start(centerLabel, true, true, 4);
        centerBox.pack_start(centerSwitch, false, false, 4);
        listBox.add(centerBox);
        
        let tilingTitleBox = new Gtk.Box({ margin_left: MARGIN, margin_right: MARGIN, margin_top: MARGIN, margin_bottom: MARGIN/2 });
        let tilingTitleLabel = new Gtk.Label({ use_markup: true, label: "<b>" + _("Tiling") + " :</b>" });
        tilingTitleLabel.set_halign(1);
        tilingTitleBox.pack_start(tilingTitleLabel, true, true, 4);
        listBox.add(tilingTitleBox);
        
        let tilingKeybindingsWidget = new KeybindingsWidget(TILING_KEYBINDINGS, this.settings);
        tilingKeybindingsWidget.margin = MARGIN;
        listBox.add(tilingKeybindingsWidget);
        
        let completionTitleBox = new Gtk.Box({ margin_left: MARGIN, margin_right: MARGIN, margin_top: MARGIN, margin_bottom: MARGIN/2 });
        let completionTitleLabel = new Gtk.Label({ use_markup: true, label: "<b>" + _("Tiling with window completion") + " :</b>" });
        completionTitleLabel.set_halign(1);
        completionTitleBox.pack_start(completionTitleLabel, true, true, 4);
        listBox.add(completionTitleBox);
        
        let internalKeybindingsWidget = new KeybindingsWidget(COMPLETION_KEYBINDINGS, this.settings);
        internalKeybindingsWidget.margin = MARGIN;
        listBox.add(internalKeybindingsWidget);
        
        let children = listBox.get_children();
        for (let i = 0; i < children.length; i++) {
            if (children[i].activatable)
                children[i].set_activatable(false);
        }
    },
    
    addSeparator: function(container) {
        let separatorRow = new Gtk.ListBoxRow({sensitive: false});
        separatorRow.add(new Gtk.Separator({ margin: MARGIN }));
        container.add(separatorRow);
    }
});

// this code comes from Sticky Notes View by Sam Bull, https://extensions.gnome.org/extension/568/notes/
var KeybindingsWidget = new GObject.Class({
    Name: Me.uuid + '.KeybindingsWidget',
    GTypeName: sanitizeGType(Me.uuid + '-KeybindingsWidget'),
    Extends: Gtk.Box,

    _init: function(keybindings, settings) {
        this.parent();
        this.set_orientation(Gtk.Orientation.VERTICAL);

        this._keybindings = keybindings;
        this._settings = settings;

        this._columns = {
            NAME: 0,
            ACCEL_NAME: 1,
            MODS: 2,
            KEY: 3
        };

        this._store = new Gtk.ListStore();
        this._store.set_column_types([
            GObject.TYPE_STRING,
            GObject.TYPE_STRING,
            GObject.TYPE_INT,
            GObject.TYPE_INT
        ]);

        this._tree_view = new Gtk.TreeView({
            model: this._store,
            hexpand: false,
            vexpand: false
        });
        this._tree_view.set_activate_on_single_click(false);
        this._tree_view.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        let action_renderer = new Gtk.CellRendererText();
        let action_column = new Gtk.TreeViewColumn({
            title: "",
            expand: true,
        });
        action_column.pack_start(action_renderer, true);
        action_column.add_attribute(action_renderer, 'text', 1);
        this._tree_view.append_column(action_column);
               
        let keybinding_renderer = new Gtk.CellRendererAccel({
            editable: true,
            accel_mode: Gtk.CellRendererAccelMode.GTK,
            xalign: 1
        });
        keybinding_renderer.connect('accel-edited',
            Lang.bind(this, function(renderer, iter, key, mods) {
                let value = Gtk.accelerator_name(key, mods);
                let [success, iterator ] =
                    this._store.get_iter_from_string(iter);

                if(!success) {
                    printerr("Can't change keybinding");
                }

                let name = this._store.get_value(iterator, 0);

                this._store.set(
                    iterator,
                    [this._columns.MODS, this._columns.KEY],
                    [mods, key]
                );
                this._settings.set_strv(name, [value]);
            })
        );

        let keybinding_column = new Gtk.TreeViewColumn({
            title: "",
        });
        keybinding_column.pack_end(keybinding_renderer, false);
        keybinding_column.add_attribute(
            keybinding_renderer,
            'accel-mods',
            this._columns.MODS
        );
        keybinding_column.add_attribute(
            keybinding_renderer,
            'accel-key',
            this._columns.KEY
        );
        this._tree_view.append_column(keybinding_column);
        this._tree_view.columns_autosize();
        this._tree_view.set_headers_visible(false);

        this.add(this._tree_view);
        this.keybinding_column = keybinding_column;
        this.action_column = action_column;

        this._refresh();
    },

    _refresh: function() {
        this._store.clear();

        for(let settings_key in this._keybindings) {
            if (settings_key.indexOf('-separator-') != -1)
                continue;
            let [key, mods] = Gtk.accelerator_parse(
                this._settings.get_strv(settings_key)[0]
            );

            let iter = this._store.append();
            this._store.set(iter,
                [
                    this._columns.NAME,
                    this._columns.ACCEL_NAME,
                    this._columns.MODS,
                    this._columns.KEY
                ],
                [
                    settings_key,
                    _GSDS(this._keybindings[settings_key]),
                    mods,
                    key
                ]
            );
        }
    }
});
