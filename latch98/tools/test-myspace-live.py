"""Compatibility entry point: the old MySpace external-link test is superseded.

See test-myspace-in-window.py for the updated embedded-window behavior.
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("test-myspace-in-window.py")),run_name="__main__")
