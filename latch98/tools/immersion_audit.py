#!/usr/bin/env python3
"""Check known immersion-breaking player-facing copy in Latch applications.

This is a narrowly scoped automated regression check, not a substitute for
reviewing every interface and dynamic error message. Developer comments and
Norn World Lab are deliberately outside its scope.
"""
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parent.parent
CASES={
    'web/standalone_runtime.js': {
        'forbidden': ['To make Bloodline available offline, load the original game HTML',
            'Fetch &amp; save from GitHub', 'It will be saved in this browser.',
            'Select the complete Bloodline HTML game'],
        'required': ['Bloodline program files were not found.', 'Retrieve Latest Release',
            'Run from Server'],
    },
    'web/desktop.js': {
        'forbidden': ['This will replace the entire current virtual disk. Continue?'],
        'required': ['This will replace all current files and settings on this computer. Continue?'],
    },
    'apps/soundstudio/index.html': {
        'forbidden': ['This is not an exact Stylophone circuit',
            'This is a standalone browser-based formant approximation',
            'Direct mic blocked: this page is not HTTPS/localhost',
            '<b>Phone microphone:</b> Direct microphone access is most reliable',
            'Microphone access was denied by Chrome or Android',
            'the virtual disk. Export project JSON'],
        'required': ['Microphone troubleshooting', 'Microphone recording failed.',
            'drive C:', 'formant synthesis'],
    },
    'apps/audacity/index.html': {
        'forbidden': ['Recording requires localhost/HTTPS',
            'not the official Audacity distribution'],
        'required': ['Recording is unavailable. Check your microphone',
            'Red Record: capture audio from a connected microphone.'],
    },
    'apps/sprite-studio/index.html': {
        'forbidden': ['Latch virtual disk is unavailable.',
            'Saved on Latch virtual C:',
            'the virtual disk limits text files to'],
        'required': ['Drive C: is unavailable.', 'Saved to C:'],
    },
    'apps/sprite-studio/app.js': {
        'forbidden': ['Latch virtual disk is unavailable.',
            'Saved on Latch virtual C:',
            'the virtual disk limits text files to'],
        'required': ['Drive C: is unavailable.', 'Saved to C:'],
    },
}

def main():
    errors=[]
    for rel,spec in CASES.items():
        text=(ROOT/rel).read_text(encoding='utf-8')
        for phrase in spec['forbidden']:
            if phrase in text:errors.append(f'{rel}: outdated player-facing phrase: {phrase}')
        for phrase in spec['required']:
            if phrase not in text:errors.append(f'{rel}: expected replacement missing: {phrase}')
    for e in errors:print('FAIL',e)
    if errors:return 1
    print(f'Immersion copy regression: PASS ({len(CASES)} source files checked).')
    print('Note: human review is still required for every dialog, dynamic error and in-world webpage.')
    return 0

if __name__=='__main__':sys.exit(main())
