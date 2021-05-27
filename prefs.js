/*
 * Copyright 2019 Abakkk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
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
 * SPDX-FileCopyrightText: 2019 Abakkk
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* jslint esversion: 6 */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const IS_GTK3 = Gtk.get_major_version() == 3;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = ExtensionUtils.getSettings && ExtensionUtils.initTranslations ? ExtensionUtils : Me.imports.convenience;
const Metadata = Me.metadata;
const _ = imports.gettext.domain(Me.metadata["gettext-domain"]).gettext;
const _GSDS = imports.gettext.domain('gsettings-desktop-schemas').gettext;
const _GTK = imports.gettext.domain(IS_GTK3 ? 'gtk30' : 'gtk40').gettext;

const MARGIN = 10;
// GTypeName is not sanitized in GS 3.28-
const UUID = Me.uuid.replace(/@/gi, '_at_').replace(/[^a-z0-9+_-]/gi, '_');

if (IS_GTK3) {
    Gtk.Container.prototype.append = Gtk.Container.prototype.add;
    Gtk.Bin.prototype.set_child = Gtk.Container.prototype.add;
}

const getChildrenOf = function(widget) {
    if (IS_GTK3) {
        return widget.get_children();
    } else {
        let listModel = widget.observe_children();
        let i = 0;
        let children = [];
        let child;
        while (!!(child = listModel.get_item(i))) {
            children.push(child);
            i++;
        }
        return children;
    }
};

var TILING_KEYBINDINGS = ['kpdivide', 'kp0', 'kp1', 'kp2', 'kp3', 'kp4', 'kp5', 'kp6', 'kp7', 'kp8', 'kp9'];
var COMPLETION_KEYBINDINGS = ['popup-kp1', 'popup-kp2', 'popup-kp3', 'popup-kp4', 'popup-kp6', 'popup-kp7', 'popup-kp8', 'popup-kp9'];

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let topStack = new TopStack();
    let switcher = new Gtk.StackSwitcher({ halign: Gtk.Align.CENTER, visible: true, stack: topStack });
    
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        if (IS_GTK3)
            topStack.get_toplevel().get_titlebar().set_custom_title(switcher);
        else
            topStack.get_root().get_titlebar().set_title_widget(switcher);
        
        return GLib.SOURCE_REMOVE;
    });
    
    if (IS_GTK3)
        topStack.show_all();
    return topStack;
}

var TopStack = new GObject.Class({
    Name: `${UUID}-TopStack`,
    Extends: Gtk.Stack,
    
    _init: function(params) {
        this.parent({ transition_type: Gtk.StackTransitionType.CROSSFADE, transition_duration: 500, hexpand: true, vexpand: true });
        
        this.prefsPage = new PrefsPage();
        this.add_titled(this.prefsPage, 'prefs', _("Preferences"));
        this.aboutPage = new AboutPage();
        this.add_titled(this.aboutPage, 'about', _("About"));
    }
});

var AboutPage = new GObject.Class({
    Name: `${UUID}-AboutPage`,
    Extends: Gtk.ScrolledWindow,

    _init: function(params) {
        this.parent();

        let vbox= new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_top: 3 * MARGIN, margin_bottom: 3 * MARGIN, margin_start: 3 * MARGIN, margin_end: 3 * MARGIN });
        this.set_child(vbox);
        
        let name = "<b> " + _(Metadata.name) + "</b>";
        let version = _("Version %d").format(Metadata.version);
        let description = _(Metadata.description);
        let link = "<span><a href=\"" + Metadata.url + "\">" + Metadata.url + "</a></span>";
        let licenseName = _GTK("GNU General Public License, version 3 or later");
        let licenseLink = "https://www.gnu.org/licenses/gpl-3.0.html";
        let license = "<small>" + _GTK("This program comes with absolutely no warranty.\nSee the <a href=\"%s\">%s</a> for details.").format(licenseLink, licenseName) + "</small>";
        
        let aboutLabel = new Gtk.Label({ wrap: true, justify: Gtk.Justification.CENTER, use_markup: true, label:
            name + "\n\n" + version + "\n\n" + description + "\n\n" + link + "\n\n" + license + "\n" });
        
        vbox.append(aboutLabel);
        
        let creditBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 2 * MARGIN, margin_bottom: 2 * MARGIN, margin_start: 2 * MARGIN, margin_end: 2 * MARGIN, spacing: 5 });
        let leftBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, hexpand: true });
        let rightBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, hexpand: true });
        leftBox.append(new Gtk.Label({ wrap: true, valign: Gtk.Align.START, halign: Gtk.Align.END, justify: Gtk.Justification.RIGHT,
                                       use_markup: true, label: "<small>" + _GTK("Created by") + "</small>" }));
        rightBox.append(new Gtk.Label({ wrap: true, valign: Gtk.Align.START, halign: Gtk.Align.START, justify: Gtk.Justification.LEFT,
                                        use_markup: true, label: "<small><a href=\"https://framagit.org/abakkk\">Abakkk</a></small>" }));
        creditBox.append(leftBox);
        creditBox.append(rightBox);
        vbox.append(creditBox);
        
        if (_("translator-credits") != "translator-credits" && _("translator-credits") != "") {
            leftBox.append(new Gtk.Label());
            rightBox.append(new Gtk.Label());
            leftBox.append(new Gtk.Label({ wrap: true, valign: Gtk.Align.START, halign: Gtk.Align.END, justify: Gtk.Justification.RIGHT,
                                           use_markup: true, label: "<small>" + _GTK("Translated by") + "</small>" }));
            rightBox.append(new Gtk.Label({ wrap: true, valign: Gtk.Align.START, halign: Gtk.Align.START, justify: Gtk.Justification.LEFT,
                                            use_markup: true, label: "<small>" + _("translator-credits") + "</small>" }));
        }
    }
    
});

var PrefsPage = new GObject.Class({
    Name: `${UUID}-PrefsPage`,
    Extends: Gtk.ScrolledWindow,

    _init: function(params) {
        this.parent();

        this.settings = Convenience.getSettings();
        
        let box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_top: 3 * MARGIN, margin_bottom: 3 * MARGIN, margin_start: 3 * MARGIN, margin_end: 3 * MARGIN });
        this.set_child(box);
        
        let listBox = new Gtk.ListBox({ selection_mode: 0, hexpand: true });
        box.append(listBox);
        
        listBox.get_style_context().add_class('background');
        
        let animationsBox = new Gtk.Box({ margin_top: MARGIN, margin_bottom: MARGIN, margin_start: MARGIN, margin_end: MARGIN, spacing: 4 });
        let animationsLabel = new Gtk.Label({ label: _("Disable animations during tiling"), halign: Gtk.Align.START, hexpand: true });
        let animationsSwitch = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        this.settings.bind("disable-animations", animationsSwitch, "active", 0);
        animationsBox.append(animationsLabel);
        animationsBox.append(animationsSwitch);
        listBox.append(animationsBox);
        
        let centerBox = new Gtk.Box({ margin_top: MARGIN, margin_bottom: MARGIN, margin_start: MARGIN, margin_end: MARGIN, spacing: 4 });
        let centerLabel = new Gtk.Label({ label: _("Move window to center of screen when unmaximizing"), halign: Gtk.Align.START, hexpand: true });
        let centerSwitch = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        this.settings.bind("center-when-unmaximizing", centerSwitch, "active", 0);
        centerBox.append(centerLabel);
        centerBox.append(centerSwitch);
        listBox.append(centerBox);
        
        let tilingTitleBox = new Gtk.Box({ margin_top: MARGIN, margin_bottom: MARGIN / 2, margin_start: MARGIN, margin_end: MARGIN, spacing: 4 });
        let tilingTitleLabel = new Gtk.Label({ use_markup: true, label: "<b>" + _("Tiling") + " :</b>", halign: Gtk.Align.START, hexpand: true });
        tilingTitleBox.append(tilingTitleLabel);
        listBox.append(tilingTitleBox);
        
        let tilingKeybindingsWidget = new KeybindingsWidget(TILING_KEYBINDINGS, this.settings);
        listBox.append(tilingKeybindingsWidget);
        
        let completionTitleBox = new Gtk.Box({ margin_top: MARGIN, margin_bottom: MARGIN / 2, margin_start: MARGIN, margin_end: MARGIN, spacing: 4 });
        let completionTitleLabel = new Gtk.Label({ use_markup: true, label: "<b>" + _("Tiling with window completion") + " :</b>", halign: Gtk.Align.START, hexpand: true });
        completionTitleBox.append(completionTitleLabel);
        listBox.append(completionTitleBox);
        
        let internalKeybindingsWidget = new KeybindingsWidget(COMPLETION_KEYBINDINGS, this.settings);
        listBox.append(internalKeybindingsWidget);
        
        let children = getChildrenOf(listBox);
        for (let i = 0; i < children.length; i++) {
            if (children[i].activatable)
                children[i].set_activatable(false);
        }
    }
});

// From Sticky Notes View by Sam Bull, https://extensions.gnome.org/extension/568/notes/
const KeybindingsWidget = new GObject.Class({
    Name: `${UUID}-KeybindingsWidget`,
    Extends: Gtk.Box,

    _init: function(settingKeys, settings) {
        this.parent({ margin_top: MARGIN, margin_bottom: MARGIN, margin_start: MARGIN, margin_end: MARGIN });
        this.set_orientation(Gtk.Orientation.VERTICAL);

        this._settingKeys = settingKeys;
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
        keybinding_renderer.connect('accel-edited', (renderer, iter, key, mods) => {
            let value = Gtk.accelerator_name(key, mods);
            let [success, iterator ] =
                this._store.get_iter_from_string(iter);

            if (!success) {
                printerr("Can't change keybinding");
            }

            let name = this._store.get_value(iterator, 0);

            this._store.set(
                iterator,
                [this._columns.MODS, this._columns.KEY],
                [mods, key]
            );
            this._settings.set_strv(name, [value]);
        });

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

        this.append(this._tree_view);
        this.keybinding_column = keybinding_column;
        this.action_column = action_column;

        this._settings.connect('changed', this._onSettingsChanged.bind(this));
        this._refresh();
    },
    
    // Support the case where all the settings has been reset.
    _onSettingsChanged: function() {
        if (this._refreshTimeout)
            GLib.source_remove(this._refreshTimeout);
        
        this._refreshTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._refreshTimeout = 0;
            this._refresh();
        });
    },

    _refresh: function() {
        this._store.clear();

        this._settingKeys.forEach(settingKey => {
            let success_, key, mods;
            if (IS_GTK3)
                [key, mods] = Gtk.accelerator_parse(this._settings.get_strv(settingKey)[0] || '');
            else
                [success_, key, mods] = Gtk.accelerator_parse(this._settings.get_strv(settingKey)[0] || '');

            let iter = this._store.append();
            this._store.set(iter,
                [
                    this._columns.NAME,
                    this._columns.ACCEL_NAME,
                    this._columns.MODS,
                    this._columns.KEY
                ],
                [
                    settingKey,
                    _GSDS(this._settings.settings_schema.get_key(settingKey).get_summary()),
                    mods,
                    key
                ]
            );
        });
    }
});
