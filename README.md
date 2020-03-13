# Keypad Tiling

Tile windows with your keypad.

## Features :

* Tile focused window with `Super` + `divide`/`0`/`1`/.../`9` keypad keys
* Get window completion popup with `Super` + `Alt` + `1`/.../`9` keypad keys
* Customize keybindings in preferences

## Install :

1. Download and decompress or clone the repository
2. Place the resulting directory in `~/.local/share/gnome-shell/extensions`
3. **Change the directory name** to `keypadTiling@abakkk.framagit.org`
4. Xorg: type `alt + F2` and `r` to restart gnome-shell  
   Wayland: restart or re-login
5. Enable the extension in gnome-tweaks or gnome-shell-extension-prefs
6. `Super + keypad key` or `Super + Alt + keypad key` to test
7. [https://framagit.org/abakkk/KeypadTiling/issues](https://framagit.org/abakkk/KeypadTiling/issues) to say it doesn't work

## Details :

* Bugs on Wayland, in particular with window completion (annoying delays between move/resize operations are used as workaround).
* Tiling is not exactly the same as the one that GNOME Shell provides. For instance left and right tiling are more basic while top, bottom and corner tiling gain resizing.
* Default keybindings could conflict with those of other extensions like popular *Dash to Dock* and *Dash to Panel* (see either *Keypad Tiling* or *other extension* preferences).

