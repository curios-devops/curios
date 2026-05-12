````md id="x4n2ka"
# Home Page Minor Refactor — Input Mode Selector

## Objective

Small UI refactor on Home Page.

Current system is already working.  
Do **not** change core logic or backend flows.

Goal is only to simplify and modernize the input controls.

---

# Main Changes

## 1. Remove Current Horizontal Three Selector

Delete the current 3-option horizontal selector.

Replace with a cleaner standard dropdown / action menu.

---

## 2. Use Existing `+` Button (Left Side of Input)

The `+` button at the left of the input becomes the access point for actions and modes.

When clicked, open menu:

```text id="7e5h8d"
Upload photos and files
---------------------
Search
Stories
Cinematic
Avatar
````

---

# Mode Selection Behavior

When user selects one mode:

* Mode becomes active
* Keep existing routing / logic
* Do not rewrite services architecture

---

# Selected Mode Visible in Input

When a mode is selected, show it inside the input box as a tag / chip.

Example:

```text id="8j1qtp"
[ Stories  ✕ ]  Ask anything...
```

Rules:

* Show selected mode inside input
* Include `✕` to remove selection
* Clicking `✕` clears mode
* If cleared, fallback to default = `Search`

---

# Modes Mapping

## Search (Default)

Maps to current regular search flow.

## Stories

Maps to current research / insights / article generation flow.

## Cinematic

Maps to current Lab / Studio flow.

## Avatar

Maps to current avatar response flow.

---

# Important Notes

* Keep existing logic as much as possible
* This is mainly a UI refactor
* Minimal routing changes only
* Reuse current services
* Keep current submit behavior

---

# UX Goals

* Cleaner homepage
* Less clutter
* Easier future expansion
* More standard UX pattern
* Better mobile usability

---

# Final Result

Input area should feel simpler:

```text id="ec3q9e"
[ + ] [ Stories ✕ ] 
```

Menu under `+`:

```text id="qf46ze"
Upload photos and files
---------------------
Search
Stories
Cinematic
Avatar
```

---

```
```
