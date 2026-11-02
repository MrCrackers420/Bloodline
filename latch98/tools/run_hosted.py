#!/usr/bin/env python3
"""Launch the standalone desktop under a trusted localhost HTTP origin.

This enables official embedded-video integrations that reject file:// pages.
Does not proxy YouTube, download media, or modify the Android port.
Requires Python 3 and a browser; no packages to install.
"""
from __future__ import annotations
import http.server
import pathlib
import socketserver
import subprocess
import sys
import tempfile
import webbrowser

ROOT=pathlib.Path(__file__).resolve().parent.parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=self.server_dir,**kwargs)
    server_dir='.'
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        self.send_header('Cache-Control','no-store')
        super().end_headers()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address=True

with tempfile.TemporaryDirectory(prefix='latch98-hosted-') as folder:
    out=pathlib.Path(folder)/'index.html'
    subprocess.run([sys.executable,str(ROOT/'tools/build_standalone.py'),str(out)],cwd=ROOT,check=True)
    Handler.server_dir=folder
    with Server(('127.0.0.1',0),Handler) as http:
        url=f'http://127.0.0.1:{http.server_address[1]}/index.html'
        print('Latch 98 hosted desktop:',url,flush=True)
        print('Leave this window open while using Latch 98. Press Ctrl+C to quit.',flush=True)
        webbrowser.open(url)
        try:http.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:pass
